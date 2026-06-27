"use client";

import { startTransition, useDeferredValue, useMemo, useState, type DragEvent } from "react";
import Link from "next/link";
import { Beaker, Boxes, ChevronRight, Grip, Layers3, Link2, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  createCompositionFromWorkbenchArtifacts,
  createWorkbenchComparisonProfile,
  evaluateWorkbenchCompatibility,
  evaluateWorkbenchConnectionCompatibility,
  prefersGraphOverlay,
  summarizeOperatorComposition,
  summarizeWorkbenchComparison,
  type OperatorCompositionMode,
} from "@methodslab/methods-engine/core";
import {
  buildPresetWorkbenchArtifact,
  defaultWorkbenchSelectionByFamily,
  operatorRegistry,
  workbenchCatalog,
  type WorkbenchSelection,
} from "@methodslab/methods-engine/presets";
import { createOperatorCompositionSceneSpec, createWorkbenchSceneSpec } from "@methodslab/visual-engine/core";
import { VisualScene } from "@methodslab/visual-engine/react";

const initialWorkspace: WorkbenchSelection[] = [
  defaultWorkbenchSelectionByFamily.matrix,
  defaultWorkbenchSelectionByFamily.optimization,
];

const paletteTransferType = "application/x-workbench-selection";

type WorkspaceNode = {
  id: string;
  selection: WorkbenchSelection;
  position: { x: number; y: number };
};

type WorkspaceConnection = {
  from: string;
  to: string;
};

const initialWorkspaceNodes: WorkspaceNode[] = initialWorkspace.map((selection, index) => ({
  id: `node-${index + 1}`,
  selection,
  position: { x: 32 + index * 180, y: 36 + index * 28 },
}));

export function WorkbenchApp() {
  const [workspace, setWorkspace] = useState<WorkspaceNode[]>(initialWorkspaceNodes);
  const [draftFamilyId, setDraftFamilyId] = useState<WorkbenchSelection["familyId"]>("matrix");
  const [draftMethodId, setDraftMethodId] = useState(defaultWorkbenchSelectionByFamily.matrix.methodId);
  const [draftExampleId, setDraftExampleId] = useState(defaultWorkbenchSelectionByFamily.matrix.exampleId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [compositionMode, setCompositionMode] = useState<OperatorCompositionMode>("comparison");
  const [search, setSearch] = useState("");
  const [connections, setConnections] = useState<WorkspaceConnection[]>([]);
  const [pendingConnectionFrom, setPendingConnectionFrom] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [connectionIssue, setConnectionIssue] = useState<string | null>(null);
  const [layerVisibility, setLayerVisibility] = useState<Record<string, Record<string, boolean>>>({});

  const deferredSearch = useDeferredValue(search);
  const filteredCatalog = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return workbenchCatalog;
    return workbenchCatalog.filter((item) => `${item.familyName} ${item.summary}`.toLowerCase().includes(query));
  }, [deferredSearch]);

  const draftCatalog = useMemo(
    () => workbenchCatalog.find((item) => item.familyId === draftFamilyId) ?? workbenchCatalog[0]!,
    [draftFamilyId],
  );

  const workspaceArtifacts = useMemo(() => workspace.map((item) => buildPresetWorkbenchArtifact(item.selection)), [workspace]);
  const activeArtifact = workspaceArtifacts[activeIndex] ?? workspaceArtifacts[0] ?? null;
  const activeNode = workspace[activeIndex] ?? workspace[0] ?? null;

  const composition = useMemo(
    () =>
      createCompositionFromWorkbenchArtifacts(workspaceArtifacts, operatorRegistry, {
        mode: compositionMode,
        nodeIds: workspace.map((item) => item.id),
        connections: compositionMode === "comparison" ? [] : connections,
      }),
    [compositionMode, connections, workspace, workspaceArtifacts],
  );
  const compositionSummary = useMemo(() => summarizeOperatorComposition(composition), [composition]);
  const compatibility = useMemo(
    () => evaluateWorkbenchCompatibility(workspaceArtifacts, compositionMode),
    [compositionMode, workspaceArtifacts],
  );
  const comparisonSummary = useMemo(() => summarizeWorkbenchComparison(workspaceArtifacts), [workspaceArtifacts]);
  const activeComparisonProfile = useMemo(
    () => (activeArtifact ? createWorkbenchComparisonProfile(activeArtifact) : null),
    [activeArtifact],
  );
  const compareBoardRows = useMemo(
    () =>
      workspaceArtifacts.map((artifact, index) => ({
        artifact,
        node: workspace[index]!,
        profile: comparisonSummary.profiles[index] ?? createWorkbenchComparisonProfile(artifact),
      })),
    [comparisonSummary.profiles, workspace, workspaceArtifacts],
  );
  const isSameFamilyComparison = useMemo(() => {
    if (workspaceArtifacts.length <= 1) return false;
    const familyIds = new Set(workspaceArtifacts.map((item) => item.familyId));
    const exampleIds = new Set(workspaceArtifacts.map((item) => item.exampleId));
    return familyIds.size === 1 && exampleIds.size === 1;
  }, [workspaceArtifacts]);

  const sceneSpec = useMemo(() => {
    if (workspaceArtifacts.length > 1 && compatibility.previewMode === "overlay") {
      return createOperatorCompositionSceneSpec(composition, { showComparisons: true, showMetrics: true });
    }
    if (activeArtifact) {
      return createWorkbenchSceneSpec(activeArtifact, {
        visibleLayerIds: visibleLayerIdsForArtifact(activeNode?.id ?? null, activeArtifact, layerVisibility),
      });
    }
    return createOperatorCompositionSceneSpec(composition, { showComparisons: true, showMetrics: true });
  }, [activeArtifact, activeNode?.id, compatibility.previewMode, composition, layerVisibility, workspaceArtifacts.length]);

  function syncDraftForFamily(familyId: WorkbenchSelection["familyId"]) {
    const selection = defaultWorkbenchSelectionByFamily[familyId];
    setDraftFamilyId(selection.familyId);
    setDraftMethodId(selection.methodId);
    setDraftExampleId(selection.exampleId);
  }

  function addDraftToWorkspace() {
    setConnectionIssue(null);
    startTransition(() => {
      setWorkspace((current) => [
        ...current,
        {
          id: `node-${Date.now()}`,
          selection: { familyId: draftFamilyId, methodId: draftMethodId, exampleId: draftExampleId },
          position: { x: 40 + (current.length % 3) * 185, y: 42 + current.length * 18 },
        },
      ]);
      setActiveIndex(workspace.length);
    });
  }

  function loadDraftFamilyComparison() {
    const methodSelections = draftCatalog.methods.map((method, index) => ({
      id: `node-compare-${draftFamilyId}-${method.id}`,
      selection: {
        familyId: draftFamilyId,
        methodId: method.id,
        exampleId: draftExampleId,
      } satisfies WorkbenchSelection,
      position: {
        x: 24 + (index % 3) * 102,
        y: 26 + Math.floor(index / 3) * 58,
      },
    }));

    setConnectionIssue(null);
    setPendingConnectionFrom(null);
    setConnections([]);
    setCompositionMode("comparison");
    setLayerVisibility({});
    startTransition(() => {
      setWorkspace(methodSelections);
      setActiveIndex(0);
    });
  }

  function removeWorkspaceItem(index: number) {
    startTransition(() => {
      const removedId = workspace[index]?.id;
      setWorkspace((current) => current.filter((_, itemIndex) => itemIndex !== index));
      setConnections((current) => current.filter((item) => item.from !== removedId && item.to !== removedId));
      setLayerVisibility((current) => {
        if (!removedId) return current;
        const next = { ...current };
        delete next[removedId];
        return next;
      });
      if (pendingConnectionFrom === removedId) setPendingConnectionFrom(null);
      setActiveIndex((current) => Math.max(0, Math.min(current, workspace.length - 2)));
    });
  }

  function handleWorkspaceDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const selectionPayload = event.dataTransfer.getData(paletteTransferType);
    if (selectionPayload) {
      const selection = parseSelectionPayload(selectionPayload);
      if (!selection) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const nextNode = {
        id: `node-${Date.now()}`,
        selection,
        position: clampGraphPosition(rect.width, rect.height, event.clientX - rect.left - 72, event.clientY - rect.top - 28),
      };
      setConnectionIssue(null);
      startTransition(() => {
        setWorkspace((current) => [...current, nextNode]);
        setActiveIndex(workspace.length);
      });
      return;
    }

    if (!draggedNodeId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextPosition = clampGraphPosition(rect.width, rect.height, event.clientX - rect.left - 72, event.clientY - rect.top - 28);
    setWorkspace((current) =>
      current.map((item) =>
        item.id === draggedNodeId
          ? {
              ...item,
              position: nextPosition,
            }
          : item,
      ),
    );
    setDraggedNodeId(null);
  }

  function reorderNode(targetIndex: number) {
    if (!draggedNodeId) return;
    setWorkspace((current) => {
      const sourceIndex = current.findIndex((item) => item.id === draggedNodeId);
      if (sourceIndex === -1 || sourceIndex === targetIndex) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setActiveIndex(targetIndex);
    setDraggedNodeId(null);
  }

  function connectNode(toId: string) {
    if (!pendingConnectionFrom || pendingConnectionFrom === toId) return;
    const fromIndex = workspace.findIndex((item) => item.id === pendingConnectionFrom);
    const toIndex = workspace.findIndex((item) => item.id === toId);
    const fromArtifact = workspaceArtifacts[fromIndex];
    const toArtifact = workspaceArtifacts[toIndex];
    if (!fromArtifact || !toArtifact) return;
    const connectionCompatibility = evaluateWorkbenchConnectionCompatibility(fromArtifact, toArtifact, compositionMode === "fused" ? "fused" : "pipeline");
    if (connectionCompatibility.kind === "incompatible") {
      setConnectionIssue(connectionCompatibility.reason);
      setPendingConnectionFrom(null);
      return;
    }

    setConnectionIssue(connectionCompatibility.kind === "comparable" ? connectionCompatibility.reason : null);
    setConnections((current) =>
      current.some((item) => item.from === pendingConnectionFrom && item.to === toId)
        ? current
        : [...current, { from: pendingConnectionFrom, to: toId }],
    );
    setPendingConnectionFrom(null);
    if (compositionMode === "comparison") setCompositionMode("pipeline");
  }

  const workspaceNodeMap = useMemo(() => new Map(workspace.map((item) => [item.id, item])), [workspace]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#17303f,_#09141d_46%,_#050b11)] text-[#ecf4f7]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-4 lg:px-6">
        <div className="mb-4 flex items-center justify-between rounded-[28px] border border-white/10 bg-white/6 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8eb6c8]">OperatorLab Workbench</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Palette, Composition, Diagnostics</h1>
          </div>
          <div className="flex items-center gap-3 text-sm text-[#bdd0d9]">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1">UI v1</span>
            <Link href="/" className="rounded-full border border-white/10 px-3 py-1 hover:bg-white/8">
              Home
            </Link>
          </div>
        </div>

        <section className="grid min-h-[calc(100vh-120px)] gap-4 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0a161f]/90">
            <div className="border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#163243] text-[#7dd3fc]">
                  <Boxes size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold">Operator Palette</div>
                  <div className="text-xs text-[#8fb0be]">Composition-ready family katalogi</div>
                </div>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Family qidirish..."
                className="mt-4 w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm outline-none placeholder:text-[#6f8792] focus:border-[#7dd3fc]/50"
              />
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {filteredCatalog.map((family) => (
                  <button
                    key={family.familyId}
                    type="button"
                    draggable
                    onClick={() => syncDraftForFamily(family.familyId)}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "copy";
                      event.dataTransfer.setData(
                        paletteTransferType,
                        serializeSelectionPayload(defaultWorkbenchSelectionByFamily[family.familyId]),
                      );
                    }}
                    className={`w-full rounded-[24px] border p-4 text-left transition ${
                      draftFamilyId === family.familyId ? "border-[#7dd3fc]/60 bg-[#103042]" : "border-white/8 bg-white/5 hover:bg-white/8"
                    }`}
                  >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-base font-semibold">{family.familyName}</div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${readinessClass(family.readiness)}`}>
                      {family.readiness}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#9ab6c2]">{family.summary}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-[#7fb8ca]">
                    <Sparkles size={14} />
                    {family.centralVisual ? "Central visual bor" : "Central visual hali partial"}
                  </div>
                </button>
              ))}
            </div>

            <div className="border-t border-white/8 px-4 py-4">
              <div className="rounded-[24px] border border-white/8 bg-black/10 p-4">
                <div className="text-sm font-semibold">Draft Node</div>
                <div className="mt-1 text-xs text-[#88a8b5]">Add tugmasi yoki graph ichiga drag/drop ishlaydi.</div>
                <div className="mt-3 space-y-3">
                  <select
                    value={draftMethodId}
                    onChange={(event) => setDraftMethodId(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-3 text-sm outline-none"
                  >
                    {draftCatalog.methods.map((method) => (
                      <option key={method.id} value={method.id} className="bg-[#0f1b24]">
                        {method.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draftExampleId}
                    onChange={(event) => setDraftExampleId(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/6 px-3 py-3 text-sm outline-none"
                  >
                    {draftCatalog.examples.map((example) => (
                      <option key={example.id} value={example.id} className="bg-[#0f1b24]">
                        {example.name}
                      </option>
                    ))}
                  </select>
                  <div
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "copy";
                      event.dataTransfer.setData(
                        paletteTransferType,
                        serializeSelectionPayload({
                          familyId: draftFamilyId,
                          methodId: draftMethodId,
                          exampleId: draftExampleId,
                        }),
                      );
                    }}
                    className="rounded-[20px] border border-dashed border-[#7dd3fc]/30 bg-[#0d2230] px-4 py-3 text-sm text-[#cde6ef]"
                  >
                    Graphga tashlash uchun tayyor:
                    <div className="mt-1 font-semibold text-white">
                      {draftCatalog.methods.find((method) => method.id === draftMethodId)?.name} /{" "}
                      {draftCatalog.examples.find((example) => example.id === draftExampleId)?.name}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addDraftToWorkspace}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7dd3fc] px-4 py-3 text-sm font-semibold text-[#0b1c24] transition hover:bg-[#b6ecff]"
                  >
                    <Plus size={16} />
                    Add To Workbench
                  </button>
                  <button
                    type="button"
                    onClick={loadDraftFamilyComparison}
                    className="flex w-full items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/15"
                  >
                    Compare This Family
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <section className="grid min-h-0 gap-4 lg:grid-rows-[auto_minmax(0,1fr)_auto]">
            <div className="rounded-[28px] border border-white/10 bg-white/6 px-4 py-4 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Workspace Nodes</div>
                  <div className="text-xs text-[#93aebb]">
                    {compositionMode === "comparison"
                      ? "Compare rejimida metodlarni yonma-yon ko‘rib chiqish va ranking olish mumkin."
                      : "Bir nechta operatorni tanlab, composition sifatida ko‘rish mumkin."}
                  </div>
                </div>
                <div className="flex rounded-full border border-white/10 bg-black/15 p-1">
                  {(["comparison", "pipeline", "fused"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCompositionMode(mode)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${
                        compositionMode === mode ? "bg-[#7dd3fc] text-[#0b1c24]" : "text-[#a8c1cc]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {workspace.map((item, index) => {
                  const artifact = workspaceArtifacts[index]!;
                  const overallScore = compareBoardRows[index]?.profile.overallScore ?? 0;
                  const connectionPreview =
                    pendingConnectionFrom && pendingConnectionFrom !== item.id
                      ? evaluateWorkbenchConnectionCompatibility(
                          workspaceArtifacts[workspace.findIndex((node) => node.id === pendingConnectionFrom)]!,
                          artifact,
                          compositionMode === "fused" ? "fused" : "pipeline",
                        )
                      : null;
                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => setDraggedNodeId(item.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => reorderNode(index)}
                      className={`flex min-w-[220px] items-center justify-between gap-3 rounded-[22px] border px-4 py-3 ${
                        activeIndex === index ? "border-[#7dd3fc]/50 bg-[#103042]" : "border-white/8 bg-white/5"
                      }`}
                    >
                      <div className="cursor-grab text-[#6f93a3]">
                        <Grip size={14} />
                      </div>
                      <button type="button" onClick={() => setActiveIndex(index)} className="min-w-0 flex-1 text-left">
                        <div className="truncate text-sm font-semibold">{artifact.methodName}</div>
                        <div className="truncate text-xs text-[#8eb0be]">{artifact.exampleName}</div>
                        {compositionMode === "comparison" ? (
                          <div className="mt-1 text-[11px] text-[#bdeaff]">Compare score: {Math.round(overallScore * 100)}%</div>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingConnectionFrom((current) => (current === item.id ? null : item.id))}
                        className={`rounded-full border p-2 ${
                          pendingConnectionFrom === item.id
                            ? "border-[#7dd3fc]/50 bg-[#7dd3fc]/15 text-[#baf0ff]"
                            : connectionPreview?.kind === "incompatible"
                              ? "border-rose-400/40 text-rose-200"
                              : "border-white/10 text-[#a8c1cc] hover:bg-white/8"
                        }`}
                      >
                        <Link2 size={14} />
                      </button>
                      <button type="button" onClick={() => removeWorkspaceItem(index)} className="rounded-full border border-white/10 p-2 text-[#a8c1cc] hover:bg-white/8">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {compositionMode === "comparison" && workspaceArtifacts.length > 1 ? (
              <div className="rounded-[28px] border border-cyan-300/15 bg-[linear-gradient(135deg,rgba(13,34,48,0.95),rgba(8,20,29,0.95))] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">Compare Board</div>
                    <div className="text-xs text-[#8fb0be]">
                      {isSameFamilyComparison
                        ? "Bir xil family va bir xil example uchun metodlar bir xil scale bilan solishtirilyapti."
                        : "Turli family yoki turli example tanlangan. Scale foydali, lekin semantik farqni hisobga oling."}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                    <span className="rounded-full bg-cyan-300/12 px-3 py-1 text-cyan-100">Click card to focus</span>
                    {isSameFamilyComparison ? (
                      <span className="rounded-full bg-emerald-300/12 px-3 py-1 text-emerald-100">Same-family compare</span>
                    ) : (
                      <span className="rounded-full bg-amber-300/12 px-3 py-1 text-amber-100">Cross-family compare</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                  {compareBoardRows.map((row, index) => (
                    <button
                      key={`compare-${row.node.id}`}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`rounded-[24px] border p-4 text-left transition ${
                        activeIndex === index ? "border-[#7dd3fc]/60 bg-[#103042]" : "border-white/8 bg-white/5 hover:bg-white/8"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold">{row.artifact.methodName}</div>
                          <div className="mt-1 truncate text-xs text-[#93aebb]">{row.artifact.exampleName}</div>
                        </div>
                        <div className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white">
                          {Math.round(row.profile.overallScore * 100)}%
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {row.profile.dimensions.map((dimension) => {
                          const leader = comparisonSummary.leaders[dimension.id];
                          const isLeader = leader?.artifactId === row.profile.artifactId;
                          return (
                            <div key={`${row.node.id}-${dimension.id}`}>
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="text-[#d7e9f1]">{dimension.label}</span>
                                <span className={isLeader ? "text-emerald-200" : "text-[#8fb0be]"}>
                                  {isLeader ? "Best" : dimension.display}
                                </span>
                              </div>
                              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/8">
                                <div
                                  className={`h-full rounded-full ${isLeader ? "bg-[linear-gradient(90deg,#34d399,_#fde047)]" : "bg-[#7dd3fc]"}`}
                                  style={{ width: `${Math.max(6, dimension.score * 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div
              className="relative min-h-[560px] overflow-hidden rounded-[34px] border border-white/10 bg-[#08121a] shadow-[0_30px_120px_rgba(0,0,0,0.35)]"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleWorkspaceDrop}
            >
              {compatibility.previewMode === "split" && workspaceArtifacts.length > 1 ? (
                <div className="grid h-full auto-rows-fr gap-3 p-4 lg:grid-cols-2 2xl:grid-cols-3">
                  {workspaceArtifacts.map((artifact, index) => (
                    <div key={`split-${workspace[index]!.id}`} className="relative min-h-[260px] overflow-hidden rounded-[26px] border border-white/10 bg-[#0b1620]">
                      <VisualScene
                        spec={createWorkbenchSceneSpec(artifact, {
                          visibleLayerIds: visibleLayerIdsForArtifact(workspace[index]!.id, artifact, layerVisibility),
                        })}
                        cameraMode="follow-spec"
                        className="absolute inset-0"
                      />
                      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/35 px-3 py-1 text-[11px] font-semibold text-[#e7f3f8] backdrop-blur">
                        {artifact.methodName}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <VisualScene spec={sceneSpec} cameraMode="follow-spec" className="absolute inset-0" />
              )}
              {workspaceArtifacts.length > 1 && prefersGraphOverlay(compatibility.previewMode) ? (
              <div className="absolute right-4 top-4 z-10 h-[280px] w-[340px] rounded-[24px] border border-white/10 bg-[#07111a]/82 p-3 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Workspace Graph</div>
                    <div className="text-[11px] text-[#8ca9b6]">Node’larni shu yerga surib joylashtiring</div>
                  </div>
                  <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#cde2eb]">
                    {connections.length} link
                  </span>
                </div>
                <div className="relative mt-3 h-[214px] rounded-[20px] border border-dashed border-white/10 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.09),_transparent_55%)]">
                  <svg className="pointer-events-none absolute inset-0 h-full w-full">
                    {connections.map((connection, index) => {
                      const from = workspaceNodeMap.get(connection.from);
                      const to = workspaceNodeMap.get(connection.to);
                      if (!from || !to) return null;
                      return (
                        <line
                          key={`${connection.from}-${connection.to}-${index}`}
                          x1={from.position.x + 68}
                          y1={from.position.y + 24}
                          x2={to.position.x + 68}
                          y2={to.position.y + 24}
                          stroke="#7dd3fc"
                          strokeWidth="2"
                          strokeDasharray="7 6"
                          opacity="0.8"
                        />
                      );
                    })}
                  </svg>
                  {workspace.map((item, index) => {
                    const artifact = workspaceArtifacts[index]!;
                    return (
                      <button
                        key={`graph-${item.id}`}
                        type="button"
                        draggable
                        onDragStart={() => setDraggedNodeId(item.id)}
                        onClick={() => setActiveIndex(index)}
                        onDoubleClick={() => connectNode(item.id)}
                        className={`absolute w-[136px] rounded-[18px] border px-3 py-2 text-left text-xs shadow-lg transition ${
                          activeIndex === index ? "border-[#7dd3fc] bg-[#0f3041] text-white" : "border-white/10 bg-[#0c1c28] text-[#d8e8ef]"
                        } ${pendingConnectionFrom === item.id ? "ring-2 ring-[#7dd3fc]/60" : ""}`}
                        style={{ left: item.position.x, top: item.position.y }}
                      >
                        <div className="truncate font-semibold">{artifact.methodName}</div>
                        <div className="mt-1 truncate text-[11px] text-[#8fb0be]">{artifact.familyName}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              ) : null}
              <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-[#7dd3fc] px-3 py-1 text-[#09202a]">{workspaceArtifacts.length > 1 ? `${compositionMode} · ${compatibility.previewMode}` : activeArtifact?.familyName ?? "Workbench"}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[#d7e7ee]">{workspaceArtifacts.length} node</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[#d7e7ee]">{compositionSummary.connectionCount} edge</span>
              </div>
              <div className="pointer-events-none absolute bottom-4 left-4 max-w-xl rounded-[20px] bg-black/35 px-4 py-3 text-sm leading-6 text-[#d9e6ed] backdrop-blur">
                {workspaceArtifacts.length > 1
                  ? compatibility.reason
                  : activeArtifact?.summary}
              </div>
              {connectionIssue ? (
                <div className="absolute bottom-4 right-4 max-w-sm rounded-[18px] border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-100 backdrop-blur">
                  {connectionIssue}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/6 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Layers3 size={16} />
                  Diagnostics
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {(activeArtifact?.diagnostics ?? []).map((item) => (
                    <div key={item.id} className="rounded-[20px] border border-white/8 bg-black/10 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-[#84a2af]">{item.label}</div>
                      <div className="mt-2 text-2xl font-semibold">{item.display}</div>
                      <div className="mt-2 text-xs leading-5 text-[#9ab3bf]">{item.interpretation}</div>
                    </div>
                  ))}
                </div>
                {activeComparisonProfile ? (
                  <div className="mt-4 rounded-[22px] border border-white/8 bg-black/10 p-4">
                    <div className="text-sm font-semibold">Normalized Comparison Language</div>
                    <div className="mt-1 text-xs text-[#8fb0be]">0 dan 1 gacha bo&apos;lgan bir xil o&apos;lchamli scale. Higher is better.</div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {activeComparisonProfile.dimensions.map((item) => (
                        <DimensionMeter key={item.id} label={item.label} score={item.score} display={item.display} summary={item.summary} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/6 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Beaker size={16} />
                  Composition Summary
                </div>
                  <div className="mt-4 space-y-3 text-sm text-[#c9d9df]">
                  <p>{compatibility.reason}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricTile label="Operators" value={String(compositionSummary.operatorCount)} />
                    <MetricTile label="Families" value={String(compositionSummary.familyCount)} />
                    <MetricTile label="Connections" value={String(compositionSummary.connectionCount)} />
                    <MetricTile label="Cross-family" value={compositionSummary.isCrossFamily ? "Yes" : "No"} />
                  </div>
                  <div className="rounded-[20px] border border-white/8 bg-black/10 p-3">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-[#87a6b3]">Leaders</div>
                    <div className="mt-3 grid gap-2">
                      {(["accuracy", "stability", "efficiency", "geometry"] as const).map((dimensionId) => {
                        const leader = comparisonSummary.leaders[dimensionId];
                        return (
                          <div key={dimensionId} className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
                            <span className="text-[#88a7b4]">{capitalize(dimensionId)}</span>
                            <span className="truncate text-right text-white">{leader ? `${leader.methodName}` : "n/a"}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#0a161f]/92">
            <div className="border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#1b2a35] text-[#facc15]">
                  <ChevronRight size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold">Inspector</div>
                  <div className="text-xs text-[#8fb0be]">Active artifact va family capability</div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {activeArtifact ? (
                <>
                  <section className="rounded-[24px] border border-white/8 bg-black/10 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-[#89a9b6]">{activeArtifact.familyName}</div>
                    <div className="mt-2 text-xl font-semibold">{activeArtifact.methodName}</div>
                    <div className="mt-1 text-sm text-[#9ab3bf]">{activeArtifact.exampleName}</div>
                    <p className="mt-3 text-sm leading-6 text-[#c8d7de]">{activeArtifact.summary}</p>
                  </section>

                  <section className="rounded-[24px] border border-white/8 bg-black/10 p-4">
                    <div className="text-sm font-semibold">Visual Contract</div>
                    <div className="mt-3 grid gap-2 text-sm text-[#c8d7de]">
                      <ContractRow label="Scene kind" value={activeArtifact.visual.sceneKind} />
                      <ContractRow label="Grammar" value={activeArtifact.visual.visualGrammar} />
                      <ContractRow label="Comparison" value={activeArtifact.visual.supportsComparison ? "Yes" : "No"} />
                      <ContractRow label="Composition" value={activeArtifact.visual.supportsComposition ? "Yes" : "No"} />
                      <ContractRow label="Connect mode" value={pendingConnectionFrom ? `From ${pendingConnectionFrom}` : "Idle"} />
                      <ContractRow label="Preview policy" value={compatibility.previewMode} />
                    </div>
                  </section>

                  <section className="rounded-[24px] border border-white/8 bg-black/10 p-4">
                    <div className="text-sm font-semibold">Layer Toggles</div>
                    <div className="mt-3 space-y-2">
                      {activeArtifact.visual.layerToggles.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (!activeNode) return;
                            setLayerVisibility((current) => {
                              const artifactState = current[activeNode.id] ?? {};
                              const currentValue = artifactState[item.id] ?? item.defaultVisible;
                              return {
                                ...current,
                                [activeNode.id]: {
                                  ...artifactState,
                                  [item.id]: !currentValue,
                                },
                              };
                            });
                          }}
                          className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-3 py-2 text-sm hover:bg-white/8"
                        >
                          <span>{item.label}</span>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${
                              layerStateForToggle(activeNode?.id ?? null, item.id, item.defaultVisible, layerVisibility)
                                ? "bg-emerald-400/15 text-emerald-200"
                                : "bg-white/10 text-[#90a8b3]"
                            }`}
                          >
                            {layerStateForToggle(activeNode?.id ?? null, item.id, item.defaultVisible, layerVisibility) ? "visible" : "hidden"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>

                  {activeComparisonProfile ? (
                    <section className="rounded-[24px] border border-white/8 bg-black/10 p-4">
                      <div className="text-sm font-semibold">Comparison Profile</div>
                      <div className="mt-3 space-y-3">
                        <div className="rounded-2xl bg-white/5 px-3 py-3">
                          <div className="text-[11px] uppercase tracking-[0.16em] text-[#89a9b6]">Overall</div>
                          <div className="mt-2 text-2xl font-semibold">{Math.round(activeComparisonProfile.overallScore * 100)}%</div>
                        </div>
                        {activeComparisonProfile.dimensions.map((item) => (
                          <MiniDimensionRow key={item.id} label={item.label} score={item.score} />
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/12 bg-black/10 p-6 text-sm text-[#91adbb]">
                  Workbench’ga operator qo‘shilgach inspector shu yerda to‘ldiriladi.
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-black/10 p-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-[#87a6b3]">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function ContractRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2">
      <span className="text-[#88a7b4]">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function readinessClass(readiness: "prototype" | "partial" | "ready") {
  if (readiness === "ready") return "bg-emerald-400/15 text-emerald-200";
  if (readiness === "partial") return "bg-amber-400/15 text-amber-200";
  return "bg-white/10 text-[#d7e7ee]";
}

function DimensionMeter({ label, score, display, summary }: { label: string; score: number; display: string; summary: string }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-[#a9c2cd]">{display}</span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,_#7dd3fc,_#fde047)]" style={{ width: `${Math.max(6, score * 100)}%` }} />
      </div>
      <div className="mt-2 text-xs leading-5 text-[#8fb0be]">{summary}</div>
    </div>
  );
}

function MiniDimensionRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-2xl bg-white/5 px-3 py-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="text-[#dff3fb]">{Math.round(score * 100)}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-[#7dd3fc]" style={{ width: `${Math.max(6, score * 100)}%` }} />
      </div>
    </div>
  );
}

function serializeSelectionPayload(selection: WorkbenchSelection) {
  return JSON.stringify(selection);
}

function parseSelectionPayload(payload: string): WorkbenchSelection | null {
  try {
    const parsed = JSON.parse(payload) as Partial<WorkbenchSelection>;
    if (!parsed.familyId || !parsed.methodId || !parsed.exampleId) return null;
    return {
      familyId: parsed.familyId,
      methodId: parsed.methodId,
      exampleId: parsed.exampleId,
    } as WorkbenchSelection;
  } catch {
    return null;
  }
}

function clampGraphPosition(width: number, height: number, x: number, y: number) {
  return {
    x: Math.max(16, Math.min(width - 170, x)),
    y: Math.max(16, Math.min(height - 80, y)),
  };
}

function visibleLayerIdsForArtifact(
  nodeId: string | null,
  artifact: NonNullable<ReturnType<typeof buildPresetWorkbenchArtifact>>,
  layerVisibility: Record<string, Record<string, boolean>>,
) {
  return artifact.visual.layerToggles
    .filter((item) => layerStateForToggle(nodeId, item.id, item.defaultVisible, layerVisibility))
    .map((item) => item.id);
}

function layerStateForToggle(
  nodeId: string | null,
  toggleId: string,
  defaultVisible: boolean,
  layerVisibility: Record<string, Record<string, boolean>>,
) {
  if (!nodeId) return defaultVisible;
  return layerVisibility[nodeId]?.[toggleId] ?? defaultVisible;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

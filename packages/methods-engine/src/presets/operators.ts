import { createOperatorRegistry, defineOperatorFamily, defineOperatorScheme } from "../core/operators";
import type { OperatorFamilySpec, OperatorSchemeSpec } from "../core";
import { examples, methods } from "./ode";
import { integrationExamples, integrationMethods } from "./integration";
import { pdeExamples, pdeMethods } from "./pde";
import { interpolationExamples, interpolationMethods } from "../core/interpolation";
import { matrixExamples, matrixMethods } from "../core/matrix";
import { probabilityExamples, probabilityMethods } from "../core/probability";
import { optimizationExamples, optimizationMethods } from "../core/optimization";
import { rootFindingExamples, rootFindingMethods } from "../core/root-finding";

function implementedScheme(
  scheme: Pick<OperatorSchemeSpec, "id" | "name" | "formula" | "color" | "geometry"> & Partial<Pick<OperatorSchemeSpec, "order" | "stability">>,
): OperatorSchemeSpec {
  return defineOperatorScheme({
    ...scheme,
    status: "implemented",
  });
}

export const operatorFamilies: OperatorFamilySpec[] = [
  defineOperatorFamily({
    id: "ode",
    name: "ODE",
    summary: "Initial-value oqimlar: trajectory, stage, error va stability geometriyasi.",
    visualGrammar: "trajectory-flow",
    status: "active",
    exampleIds: examples.map((item) => item.id),
    schemes: methods.map((item) =>
      implementedScheme({
        id: item.id,
        name: item.name,
        formula: item.formula,
        color: item.color,
        geometry: item.geometry,
        stability: item.stability,
      }),
    ),
    workbench: {
      traceScene: true,
      comparison: true,
      benchmark: true,
      customMethod: true,
      composition: true,
      centralVisual: true,
      readiness: "ready",
      nextFocus: "Operator chain va fused time-step composition semantics'ini bir xil contractga tushirish.",
    },
  }),
  defineOperatorFamily({
    id: "integral",
    name: "Integral",
    summary: "Bo‘linma geometriyasi: panel, surface, volume va convergence visual grammar.",
    visualGrammar: "partition-accumulation",
    status: "active",
    exampleIds: integrationExamples.map((item) => item.id),
    applications: [
      { id: "scientific-computing", label: "Scientific computing", summary: "Quadrature va accumulated flux hisoblari simulation, PDE va inverse masalalarda asosiy rol o'ynaydi." },
      { id: "finance-risk", label: "Finance / risk", summary: "Expectation, payoff va weighted Monte Carlo integrallari amaliy risk va pricing hisoblarida ko'p uchraydi." },
    ],
    schemes: integrationMethods.map((item) =>
      implementedScheme({
        id: item.id,
        name: item.name,
        formula: item.formula,
        color: item.color,
        geometry: item.geometry,
        order: item.order,
      }),
    ),
    workbench: {
      traceScene: true,
      comparison: true,
      benchmark: true,
      customMethod: true,
      composition: true,
      centralVisual: true,
      readiness: "ready",
      nextFocus: "Area, surface va volume integral composition'ni yagona pipeline view'da birlashtirish.",
    },
  }),
  defineOperatorFamily({
    id: "pde",
    name: "PDE",
    summary: "Maydon va grid orqali ifodalanuvchi diffuziya, profil va heatmap geometriyasi.",
    visualGrammar: "field-mesh",
    status: "active",
    exampleIds: pdeExamples.map((item) => item.id),
    schemes: pdeMethods.map((item) =>
      implementedScheme({
        id: item.id,
        name: item.name,
        formula: item.formula,
        color: item.color,
        geometry: item.geometry,
        order: item.order,
        stability: item.stability,
      }),
    ),
    workbench: {
      traceScene: true,
      comparison: true,
      benchmark: true,
      customMethod: true,
      composition: true,
      centralVisual: true,
      readiness: "ready",
      nextFocus: "Field profile, error history va operator pipeline'ni workbench canvas'da birga boshqarish.",
    },
  }),
  defineOperatorFamily({
    id: "matrix",
    name: "Matrix / linear algebra",
    summary: "Linear transform, basis deformation, spectrum va iterative convergence family.",
    visualGrammar: "transform-basis",
    status: "active",
    exampleIds: matrixExamples.map((item) => item.id),
    applications: [
      { id: "ai-ml", label: "AI / ML", summary: "Covariance, PCA/SVD, linear solve va conditioning tahlillari representation va training pipeline'lari uchun muhim." },
      { id: "scientific-computing", label: "Scientific computing", summary: "Iterative solve, eigenspectrum va operator conditioning ko'p hisoblashli tizimlarning markazida turadi." },
    ],
    notes: "Will host matrix transforms, eigen problems, sparse solvers, and iterative linear systems.",
    schemes: matrixMethods.map((item) =>
      implementedScheme({
        id: item.id,
        name: item.name,
        formula: item.formula,
        color: item.color,
        geometry: item.geometry,
        order: item.order,
        stability: item.stability,
      }),
    ),
    workbench: {
      traceScene: true,
      comparison: true,
      benchmark: true,
      customMethod: true,
      composition: true,
      centralVisual: true,
      readiness: "ready",
      nextFocus: "Atomic vs fused linear operators va sparse pipeline comparison'ni rich semantics bilan ulash.",
    },
  }),
  defineOperatorFamily({
    id: "root-finding",
    name: "Root finding",
    summary: "Nol izlash va convergence path operatorlari uchun scalar geometry family.",
    visualGrammar: "convergence-path",
    status: "active",
    exampleIds: rootFindingExamples.map((item) => item.id),
    notes: "Will show brackets, tangent updates, and shrinking intervals on 1D landscapes.",
    schemes: rootFindingMethods.map((item) =>
      implementedScheme({
        id: item.id,
        name: item.name,
        formula: item.formula,
        color: item.color,
        geometry: item.geometry,
        order: item.order,
        stability: item.stability,
      }),
    ),
    workbench: {
      traceScene: true,
      comparison: true,
      benchmark: true,
      customMethod: true,
      composition: true,
      centralVisual: true,
      readiness: "ready",
      nextFocus: "Bracketed va open methods'ni hybrid root pipeline sifatida kompozitsiya qilish.",
    },
  }),
  defineOperatorFamily({
    id: "optimization",
    name: "Optimization",
    summary: "Loss landscape, descent flow va curvature-aware search family.",
    visualGrammar: "landscape-descent",
    status: "active",
    exampleIds: optimizationExamples.map((item) => item.id),
    applications: [
      { id: "ai-ml", label: "AI / ML", summary: "Loss descent, curvature va optimizer barqarorligi model treningi sifatiga bevosita ta'sir qiladi." },
      { id: "simulation-control", label: "Control / design", summary: "Parameter fitting va objective minimization ko'plab control va inverse design masalalarida ishlatiladi." },
    ],
    notes: "Will focus on minima, saddle points, basin boundaries, and convergence speed.",
    schemes: optimizationMethods.map((item) =>
      implementedScheme({
        id: item.id,
        name: item.name,
        formula: item.formula,
        color: item.color,
        geometry: item.geometry,
        order: item.order,
        stability: item.stability,
      }),
    ),
    workbench: {
      traceScene: true,
      comparison: true,
      benchmark: true,
      customMethod: true,
      composition: true,
      centralVisual: true,
      readiness: "partial",
      nextFocus: "Optimizer state semantics va step diagnostics'ni workbench-ready qilish.",
    },
  }),
  defineOperatorFamily({
    id: "probability",
    name: "Probability / stochastic",
    summary: "Random paths, uncertainty spread, diffusion va stochastic process geometriyasi.",
    visualGrammar: "stochastic-path",
    status: "active",
    exampleIds: probabilityExamples.map((item) => item.id),
    applications: [
      { id: "ai-ml", label: "AI / ML", summary: "Uncertainty estimation, stochastic optimization va probabilistic modeling uchun sampling sifati juda muhim." },
      { id: "finance-risk", label: "Finance / risk", summary: "Tail risk, payoff uncertainty va confidence interval amaliy risk tahlilining markaziy qismidir." },
    ],
    notes: "Will host SDE, random walks, Monte Carlo path ensembles, and uncertainty geometry.",
    schemes: probabilityMethods.map((item) =>
      implementedScheme({
        id: item.id,
        name: item.name,
        formula: item.formula,
        color: item.color,
        geometry: item.geometry,
        order: item.order,
        stability: item.stability,
      }),
    ),
    workbench: {
      traceScene: true,
      comparison: true,
      benchmark: true,
      customMethod: true,
      composition: true,
      centralVisual: true,
      readiness: "partial",
      nextFocus: "Stochastic path ensembles va variance-reduction composition'ni operator graph bilan ulash.",
    },
  }),
  defineOperatorFamily({
    id: "interpolation",
    name: "Interpolation / approximation",
    summary: "Node-to-curve reconstruction, spline smoothness va approximation xatoligi family.",
    visualGrammar: "curve-reconstruction",
    status: "active",
    exampleIds: interpolationExamples.map((item) => item.id),
    notes: "Shows how sample nodes turn into smooth curves, local support, and approximation quality.",
    schemes: interpolationMethods.map((item) =>
      implementedScheme({
        id: item.id,
        name: item.name,
        formula: item.formula,
        color: item.color,
        geometry: item.geometry,
        order: item.order,
        stability: item.stability,
      }),
    ),
    workbench: {
      traceScene: true,
      comparison: true,
      benchmark: true,
      customMethod: true,
      composition: true,
      centralVisual: true,
      readiness: "ready",
      nextFocus: "Node selection, fit stage va smoothing stage'larni pipeline ko'rinishida ajratish.",
    },
  }),
];

export const operatorFamiliesById = Object.fromEntries(operatorFamilies.map((family) => [family.id, family])) as Record<
  OperatorFamilySpec["id"],
  OperatorFamilySpec
>;

export const operatorRegistry = createOperatorRegistry(operatorFamilies);

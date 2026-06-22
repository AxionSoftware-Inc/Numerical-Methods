import { createOperatorRegistry, defineOperatorFamily, defineOperatorScheme } from "../core/operators";
import type { OperatorFamilySpec, OperatorSchemeSpec } from "../core";
import { examples, methods } from "./ode";
import { integrationExamples, integrationMethods } from "./integration";
import { pdeExamples, pdeMethods } from "./pde";

function implementedScheme(
  scheme: Pick<OperatorSchemeSpec, "id" | "name" | "formula" | "color" | "geometry"> & Partial<Pick<OperatorSchemeSpec, "order" | "stability">>,
): OperatorSchemeSpec {
  return defineOperatorScheme({
    ...scheme,
    status: "implemented",
  });
}

function plannedScheme(
  scheme: Pick<OperatorSchemeSpec, "id" | "name" | "formula" | "color" | "geometry"> & Partial<Pick<OperatorSchemeSpec, "order" | "stability">>,
): OperatorSchemeSpec {
  return defineOperatorScheme({
    ...scheme,
    status: "planned",
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
  }),
  defineOperatorFamily({
    id: "integral",
    name: "Integral",
    summary: "Bo‘linma geometriyasi: panel, surface, volume va convergence visual grammar.",
    visualGrammar: "partition-accumulation",
    status: "active",
    exampleIds: integrationExamples.map((item) => item.id),
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
  }),
  defineOperatorFamily({
    id: "matrix",
    name: "Matrix / linear algebra",
    summary: "Linear transform, basis deformation, spectrum va iterative convergence family.",
    visualGrammar: "transform-basis",
    status: "active",
    exampleIds: [],
    notes: "Will host matrix transforms, eigen problems, sparse solvers, and iterative linear systems.",
    schemes: [
      implementedScheme({
        id: "jacobi",
        name: "Jacobi",
        formula: "x^(k+1) = D^-1(b - (L+U)x^k)",
        color: "#60a5fa",
        geometry: "Basis vectors remain visible while the iterate contracts toward a fixed linear system solution.",
        order: "O(n^2)",
        stability: "Diagonal dominance talab qiladi",
      }),
      implementedScheme({
        id: "gauss-seidel",
        name: "Gauss-Seidel",
        formula: "(D+L)x^(k+1) = b - Ux^k",
        color: "#34d399",
        geometry: "Oldingi komponentlar darhol yangilanadi, shuning uchun iterative deformation tezroq ko‘rinadi.",
        order: "O(n^2)",
        stability: "Jacobi'dan ko‘proq sokin",
      }),
      implementedScheme({
        id: "power-iteration",
        name: "Power Iteration",
        formula: "x^(k+1) = A x^k / ||A x^k||",
        color: "#f59e0b",
        geometry: "Dominant eigenvector tomon basis arrows tortiladi; spectrum to'g'ridan-to'g'ri geometrik siljish sifatida ko‘rinadi.",
        order: "O(n^2)",
        stability: "Dominant eigenvalue ajralib tursa ishlaydi",
      }),
    ],
  }),
  defineOperatorFamily({
    id: "root-finding",
    name: "Root finding",
    summary: "Nol izlash va convergence path operatorlari uchun scalar geometry family.",
    visualGrammar: "convergence-path",
    status: "active",
    exampleIds: [],
    notes: "Will show brackets, tangent updates, and shrinking intervals on 1D landscapes.",
    schemes: [
      implementedScheme({
        id: "bisection",
        name: "Bisection",
        formula: "[a,b] -> midpoint sign test",
        color: "#f97316",
        geometry: "Interval har qadamda yarmiga qisqaradi, shuning uchun convergence daraxti juda aniq ko‘rinadi.",
        order: "O(log n)",
        stability: "Bracketing mavjud bo‘lsa ishonchli",
      }),
      implementedScheme({
        id: "secant",
        name: "Secant",
        formula: "x_(k+1) = x_k - f(x_k)(x_k-x_(k-1))/(f(x_k)-f(x_(k-1)))",
        color: "#a78bfa",
        geometry: "Ikki nuqtali tangensiya yo‘li kamayib boruvchi iteration path hosil qiladi.",
        order: "Superlinear",
        stability: "Boshlang‘ich juftlik sifatli bo‘lsa ishlaydi",
      }),
      implementedScheme({
        id: "newton",
        name: "Newton",
        formula: "x_(k+1) = x_k - f(x_k)/f'(x_k)",
        color: "#22d3ee",
        geometry: "Tangent step root tomon keskin otadi; geometriyada local linearization juda aniq ko‘rinadi.",
        order: "Quadratic",
        stability: "Derivative va start pointga sezgir",
      }),
    ],
  }),
  defineOperatorFamily({
    id: "optimization",
    name: "Optimization",
    summary: "Loss landscape, descent flow va curvature-aware search family.",
    visualGrammar: "landscape-descent",
    status: "active",
    exampleIds: [],
    notes: "Will focus on minima, saddle points, basin boundaries, and convergence speed.",
    schemes: [
      implementedScheme({
        id: "gradient-descent",
        name: "Gradient Descent",
        formula: "x_(k+1) = x_k - η ∇f(x_k)",
        color: "#f43f5e",
        geometry: "Kontur chiziqlari bo‘ylab pastga tushuvchi flow darhol ko‘rinadi.",
        order: "Depends on condition number",
        stability: "Step size to‘g‘ri tanlansa",
      }),
      implementedScheme({
        id: "momentum",
        name: "Momentum",
        formula: "v_(k+1)=βv_k+∇f(x_k), x_(k+1)=x_k-ηv_(k+1)",
        color: "#14b8a6",
        geometry: "Inertia descent pathni tekislaydi; valley bo‘ylab slalom kamayadi.",
        order: "Depends on tuning",
        stability: "Momentum va step size muvozanati muhim",
      }),
      implementedScheme({
        id: "newton-optimization",
        name: "Newton",
        formula: "x_(k+1)=x_k-H^-1∇f(x_k)",
        color: "#f59e0b",
        geometry: "Curvature-aware lokal sakrashlar minimumga tez yaqinlashadi.",
        order: "Quadratic",
        stability: "Hessian invertible bo‘lsa kuchli",
      }),
    ],
  }),
  defineOperatorFamily({
    id: "probability",
    name: "Probability / stochastic",
    summary: "Random paths, uncertainty spread, diffusion va stochastic process geometriyasi.",
    visualGrammar: "stochastic-path",
    status: "active",
    exampleIds: [],
    notes: "Will host SDE, random walks, Monte Carlo path ensembles, and uncertainty geometry.",
    schemes: [
      implementedScheme({
        id: "euler-maruyama",
        name: "Euler-Maruyama",
        formula: "X_(n+1)=X_n+μ(X_n,t_n)Δt+σ(X_n,t_n)√Δt ξ_n",
        color: "#60a5fa",
        geometry: "Ko‘p sample pathlar drift va noise o‘rtasidagi tarqalishni bir sahnada ko‘rsatadi.",
        order: "Strong order 1/2",
        stability: "Noise scale va time-stepga sezgir",
      }),
      implementedScheme({
        id: "milstein",
        name: "Milstein",
        formula: "X_(n+1)=X_n+μΔt+σΔW+1/2 σσ_x((ΔW)^2-Δt)",
        color: "#c084fc",
        geometry: "Noise curvature correction path’larni ancha silliq va aniqroq qiladi.",
        order: "Strong order 1",
        stability: "Diffusion derivative talab qiladi",
      }),
      implementedScheme({
        id: "monte-carlo",
        name: "Monte Carlo Ensemble",
        formula: "E[f(X)] ≈ (1/N) Σ f(X^(i))",
        color: "#34d399",
        geometry: "Ansambl buluti expectation va variance’ni ko‘rinadigan shaklga aylantiradi.",
        order: "O(N^(-1/2))",
        stability: "Sample count oshsa sokinlashadi",
      }),
    ],
  }),
  defineOperatorFamily({
    id: "interpolation",
    name: "Interpolation / approximation",
    summary: "Node-to-curve reconstruction, spline smoothness va approximation xatoligi family.",
    visualGrammar: "curve-reconstruction",
    status: "active",
    exampleIds: [],
    notes: "Shows how sample nodes turn into smooth curves, local support, and approximation quality.",
    schemes: [
      implementedScheme({
        id: "lagrange",
        name: "Lagrange Polynomial",
        formula: "p_n(x)=\\sum_{i=0}^n y_i L_i(x)",
        color: "#fb7185",
        geometry: "Barcha tugunlardan o'tuvchi global egri chiziq hosil qiladi va node influence darhol ko'rinadi.",
        order: "Global polynomial",
        stability: "Ko'p node'da Runge effekti bo'lishi mumkin",
      }),
      implementedScheme({
        id: "newton-divided-difference",
        name: "Newton Divided Difference",
        formula: "p_n(x)=a_0+a_1(x-x_0)+\\cdots+a_n\\prod_{j=0}^{n-1}(x-x_j)",
        color: "#38bdf8",
        geometry: "Incremental qurilish sabab har qo'shilgan node egri chiziqni bosqichma-bosqich o'zgartiradi.",
        order: "Incremental polynomial",
        stability: "Node tartibi va masofasiga sezgir",
      }),
      implementedScheme({
        id: "cubic-spline",
        name: "Cubic Spline",
        formula: "S_i(x)=a_i+b_i(x-x_i)+c_i(x-x_i)^2+d_i(x-x_i)^3",
        color: "#34d399",
        geometry: "Lokal segmentlar bilan silliq curve yasaydi; curvature uzluksiz ko'rinadi.",
        order: "Piecewise cubic",
        stability: "Amaliyotda juda sokin va ishonchli",
      }),
    ],
  }),
];

export const operatorFamiliesById = Object.fromEntries(operatorFamilies.map((family) => [family.id, family])) as Record<
  OperatorFamilySpec["id"],
  OperatorFamilySpec
>;

export const operatorRegistry = createOperatorRegistry(operatorFamilies);

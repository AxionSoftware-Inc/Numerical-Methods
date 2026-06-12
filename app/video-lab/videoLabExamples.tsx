export type VideoLabExample = {
  id: string;
  title: string;
  description: string;
  code: string;
};

export const VIDEO_LAB_EXAMPLES: VideoLabExample[] = [
  {
    id: "volume-integral",
    title: "Volume Integral",
    description: "Variables, formula, Riemann columns, point, arrow, timeline.",
    code: `scene "Volume Integral Demo"
duration = 8
fps = 30

camera orbit radius 5.5 height 3.05 turns 0.62

main = cyan
peak_pos = [0, 0.54, 0]
mark_from = [-0.72, 0.35, -0.48]

title "Volume Integral"
subtitle "Riemann columns as a code-first video scene"
formula f = "\\int_a^b\\int_c^d f(x,y)\\,dx\\,dy" at formula color main

grid
riemann columns count 7

point peak at peak_pos label "max contribution"
arrow mark from mark_from to peak_pos color red

drop title from top in 0.85s
write f in 0.9s
show columns from 0.18 in 1.2s
highlight peak in 0.75s
fade analysis in 0.8s
spin columns y 0.72 turns in 2.5s
wait 0.4s`,
  },
  {
    id: "function-graph",
    title: "Function Graph",
    description: "Graph, area, circle and number line primitives.",
    code: `scene "Function Graph"
duration = 8
fps = 30

camera preset 2d

title "Function Graph"
subtitle "Sampled math primitives"

grid
axes

graph s = sin(x) from -pi to pi color cyan
area a = sin(x) from 0 to pi color yellow opacity 0.45
graph p = 0.25*x^2 - 0.8 from -2.8 to 2.8 color red
circle c at center radius 1 color white opacity 0.4
number_line n from -5 to 5 ticks 10 color slate y -1.25

write title in 0.7s
show n from 0 in 0.6s
show c from 0 in 0.7s
show a from 0 in 0.8s
show s from 0 in 1s
show p from 0 in 1s
highlight s in 0.7s
wait 0.5s`,
  },
  {
    id: "sine-wave-story",
    title: "Premium: Sine Wave Story",
    description: "A single cohesive mini-lesson with five connected beats in one timeline.",
    code: `scene "How Sine Waves Work"
duration = 24
fps = 30

camera preset 2d

main = cyan
accent = yellow
period = green
slope = orange
mixc = white

crest_pos = [0.864, 0.55, 0.05]
trough_pos = [-0.864, -0.55, 0.05]
amp_from = [1.95, 0, 0.05]
amp_to = [1.95, 0.55, 0.05]
cycle_left = [-1.728, -1.2, 0.05]
cycle_right = [1.728, -1.2, 0.05]

title "How Sine Waves Work"
subtitle "One graph, five ideas, one continuous scene"

grid
axes
number_line phase from -pi to pi ticks 4 color slate y -1.22

text ch1 = "1. A sine wave turns angle into height" at [-1.35, 1.02, 0.2] color white scale 0.16
formula eq1 = "y=\\sin(x)" at [-1.08, 0.62, 0.2] color main scale 0.22

text ch2 = "2. Amplitude is the peak distance from the center line" at [-1.35, 1.02, 0.2] color white scale 0.145
formula eq2 = "\\max |y| = 1" at [-1.08, 0.62, 0.2] color accent scale 0.2

text ch3 = "3. One full cycle runs from -\\pi to \\pi" at [-1.35, 1.02, 0.2] color white scale 0.15
formula eq3 = "T = 2\\pi" at [-1.08, 0.62, 0.2] color period scale 0.2

text ch4 = "4. The slope changes at every point on the wave" at [-1.35, 1.02, 0.2] color white scale 0.15
formula eq4 = "\\frac{d}{dx}\\sin(x)=\\cos(x)" at [-1.08, 0.62, 0.2] color slope scale 0.18

text ch5 = "5. Adding waves creates richer motion" at [-1.35, 1.02, 0.2] color white scale 0.16
formula eq5 = "\\sin(x)+0.6\\sin(2x)" at [-1.08, 0.62, 0.2] color mixc scale 0.2

graph base = sin(x) from -pi to pi color main
point crest at crest_pos color accent label "crest"
point trough at trough_pos color accent label "trough"
arrow amp from amp_from to amp_to color accent
text amp_note = "amplitude = 1" at [1.36, 0.34, 0.05] color accent scale 0.13

path cycle points cycle_left cycle_right color period opacity 0.9
point cycle_a at cycle_left color period radius 0.05
point cycle_b at cycle_right color period radius 0.05
text cycle_note = "one full cycle = 2\\pi" at [-0.62, -0.98, 0.05] color period scale 0.13

tangent tan = sin(x) at 0.85 length 2.2 color slope point label "local slope"
text slope_note = "near x = 0.85 the graph behaves almost like a line" at [-1.34, -1.48, 0.05] color slope scale 0.115

wave w1 = sin(x) from -pi to pi amplitude 0.5 color main y 0.72
wave w2 = 0.6*sin(2*x) from -pi to pi amplitude 0.34 color accent y 0
interference mix a = sin(x) b = 0.6*sin(2*x) from -pi to pi color mixc amplitude 0.42 y -0.74
text mix_note = "superposition bends the final waveform" at [-1.32, -1.48, 0.05] color mixc scale 0.12

drop title from top in 0.8s
fade phase in 0.6s
write ch1 in 0.6s
write eq1 in 0.8s
fade base in 1s
wait 0.6s
fadeout ch1 in 0.4s
fadeout eq1 in 0.4s

write ch2 in 0.6s
write eq2 in 0.7s
fade crest in 0.5s
fade trough in 0.5s
fade amp in 0.6s
fade amp_note in 0.6s
highlight crest in 0.7s
wait 0.8s
fadeout ch2 in 0.4s
fadeout eq2 in 0.4s
fadeout amp in 0.4s
fadeout amp_note in 0.4s

write ch3 in 0.6s
write eq3 in 0.7s
fade cycle in 0.6s
fade cycle_a in 0.4s
fade cycle_b in 0.4s
fade cycle_note in 0.6s
highlight cycle in 0.7s
wait 0.8s
fadeout ch3 in 0.4s
fadeout eq3 in 0.4s
fadeout cycle in 0.4s
fadeout cycle_a in 0.3s
fadeout cycle_b in 0.3s
fadeout cycle_note in 0.4s

write ch4 in 0.6s
write eq4 in 0.8s
fade tan in 0.8s
fade slope_note in 0.6s
highlight tan in 0.8s
wait 0.8s
fadeout ch4 in 0.4s
fadeout eq4 in 0.4s
fadeout tan in 0.4s
fadeout slope_note in 0.4s
fadeout crest in 0.3s
fadeout trough in 0.3s
fadeout base in 0.5s

write ch5 in 0.6s
write eq5 in 0.8s
fade w1 in 0.7s
fade w2 in 0.7s
fade mix in 0.9s
fade mix_note in 0.6s
highlight mix in 0.8s
wait 1.4s`,
  },
  {
    id: "derivative-2d",
    title: "Derivative 2D",
    description: "2D-ready graph, tangent, secant and highlighted point.",
    code: `scene "Derivative 2D"
duration = 8
fps = 30

camera preset 2d

title "Derivative"
subtitle "Graph, tangent and secant in a clean 2D layout"

grid
axes

graph g = sin(x) from -pi to pi color cyan
tangent tg = sin(x) at 0.85 length 2.2 color yellow point label "tangent"
secant sc = sin(x) from -0.4 to 1.45 color green points label "secant"
point p at [0.467, 0.752, 0.05] color white label "f(a)"

write title in 0.7s
show g from 0 in 0.9s
show tg from 0 in 0.8s
show sc from 0 in 0.8s
highlight p in 0.6s
wait 0.5s`,
  },
  {
    id: "sine-cosine-2d",
    title: "Sine + Cosine 2D",
    description: "Clean orthographic trig scene centered for 2D math videos.",
    code: `scene "Sine And Cosine"
duration = 8
fps = 30

camera preset 2d

title "Sine and Cosine"
subtitle "2D orthographic layout ready for math videos"

grid
axes

graph s = sin(x) from -pi to pi color cyan
graph c = cos(x) from -pi to pi color yellow
point p at [0, 1, 0] color white label "cos(0)"

write title in 0.7s
show s from 0 in 1s
show c from 0 in 1s
highlight p in 0.7s
wait 0.6s`,
  },
  {
    id: "vector-field",
    title: "Vector Field",
    description: "Physics-style vector field, particle and circular orbit.",
    code: `scene "Vector Field"
duration = 8
fps = 30

camera preset 2d

title "Vector Field"
subtitle "Rotational field around a particle"

grid
axes

field F x = -t y = x range 2 step 1 color cyan
particle charge at origin color yellow label "q"
circle orbit at center radius 1.1 color yellow opacity 0.55
vector v from origin to [1, 0.7, 0] color red

write title in 0.7s
show F from 0 in 1s
show charge from 0 in 0.5s
show orbit from 0 in 0.8s
show v from 0 in 0.7s
highlight charge in 0.8s
wait 0.5s`,
  },
  {
    id: "wave-scene",
    title: "Wave Scene",
    description: "Static wave primitives prepared for physics videos.",
    code: `scene "Wave Visualization"
duration = 8
fps = 30

camera orbit radius 5.2 height 3.0 turns 0.38

title "Wave Visualization"
subtitle "Sinusoidal waves as visual paths"

grid
axes

wave w1 = sin(x) from -pi to pi amplitude 0.75 color cyan y 0.65
wave w2 = sin(2*x) from -pi to pi amplitude 0.45 color yellow y -0.25
graph envelope = 0.8*cos(0.5*x) from -pi to pi color red

write title in 0.7s
show w1 from 0 in 1s
show w2 from 0 in 1s
show envelope from 0 in 1s
highlight w1 in 0.7s
wait 0.6s`,
  },
  {
    id: "projectile-trajectory",
    title: "Projectile",
    description: "Particle and trajectory for basic mechanics scenes.",
    code: `scene "Projectile Motion"
duration = 8
fps = 30

camera orbit radius 5.4 height 3.1 turns 0.42

title "Projectile Motion"
subtitle "Trajectory sampled from x(t), y(t)"

grid
axes

trajectory path x = t y = t - 0.2*t^2 from 0 to 5 color yellow
particle ball at [0, 0, 0] radius 0.07 color yellow label "ball"
vector velocity from [0, 0, 0] to [0.8, 0.8, 0] color cyan
vector gravity from [1.8, 0.8, 0] to [1.8, 0.2, 0] color red

write title in 0.7s
show path from 0 in 1s
show ball from 0 in 0.5s
show velocity from 0 in 0.7s
show gravity from 0 in 0.7s
highlight path in 0.8s
wait 0.6s`,
  },
  {
    id: "vector-scene",
    title: "Vector Addition",
    description: "Numpy-like points, arrows, labels and highlight.",
    code: `scene "Vector Addition"
duration = 7
fps = 30

camera orbit radius 5.2 height 2.8 turns 0.45

o = [0, 0, 0]
a_end = [0.9, 0.45, 0.15]
b_end = [1.35, 0.95, 0.65]

title "Vector Addition"
subtitle "Two vectors and their resultant"

grid
axes

arrow a from o to a_end color sky
arrow b from a_end to b_end color yellow
arrow result from o to b_end color red

text label_a = "a" at [0.55, 0.58, 0.18] color sky
text label_b = "b" at [1.18, 0.88, 0.42] color yellow
text label_r = "a + b" at [0.72, 1.05, 0.45] color red

write title in 0.75s
fade axes in 0.5s
show a from 0 in 0.7s
show b from 0 in 0.7s
show result from 0 in 0.9s
highlight result in 0.8s
wait 0.5s`,
  },
  {
    id: "transform-box",
    title: "Transform Box",
    description: "Move, rotate, scale with natural commands.",
    code: `scene "Transform Demo"
duration = 7
fps = 30

camera orbit radius 5.1 height 2.9 turns 0.52

start = [-0.65, -0.25, 0]
end = [0.72, 0.2, 0]

title "Transform Demo"
subtitle "Move, scale and rotate objects"

grid
axes

plane base at grid size 2.4 2.4 color teal opacity 0.18
box cube at start size 0.55 color sky opacity 0.9
path motion points start [0, -0.05, 0.35] end color yellow

write title in 0.75s
show base from 0 in 0.6s
show cube from 0 in 0.6s
show motion from 0 in 0.8s
move cube to end in 1.2s
scale cube 1.35 in 0.8s
rotate cube y 180deg in 1.1s
highlight cube in 0.7s
wait 0.4s`,
  },
  {
    id: "formula-focus",
    title: "Formula Focus",
    description: "Formula, note text, highlight and layout positions.",
    code: `scene "Derivative Definition"
duration = 6
fps = 30

camera orbit radius 4.8 height 2.6 turns 0.32

accent = cyan
note_pos = bottom-left

title "Derivative"
subtitle "Limit definition of slope"
formula eq = "f'(x)=\\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}" at formula color accent
text note = "A derivative is local rate of change" at note_pos color yellow scale 0.13

grid
axes

write title in 0.7s
write eq in 1.2s
show note from 0 in 0.8s
move eq up 0.25 in 0.7s
highlight eq in 0.8s
wait 0.6s`,
  },

  {
  id: "force-spring",
  title: "Force & Spring",
  description: "Mechanics primitives: spring, particle and force vectors.",
  code: `scene "Force And Spring"
duration = 8
fps = 30

camera orbit radius 5.4 height 3.1 turns 0.42

grid
axes

title "Force and Spring"
subtitle "Basic mechanics primitives"

spring s from [-1.2, 0, 0] to [1.2, 0, 0] turns 10 amplitude 0.13 color cyan
particle m at [1.2, 0, 0] color yellow label "m"
force F from [1.2, 0, 0] to [1.8, 0.45, 0] color red label "F"
force G from [1.2, 0, 0] to [1.2, -0.7, 0] color yellow label "mg"

write title in 0.7s
show s from 0 in 1s
show m from 0 in 0.5s
show F from 0 in 0.7s
show G from 0 in 0.7s
highlight m in 0.7s
wait 0.5s`,
},

{
  id: "wave-interference",
  title: "Wave Interference",
  description: "Two waves and their superposition result.",
  code: `scene "Wave Interference"
duration = 8
fps = 30

camera orbit radius 5.5 height 3.2 turns 0.35

grid
axes

title "Wave Interference"
subtitle "Two waves and their superposition"

interference i a = sin(2*x) b = sin(2*x + 1.2) from -pi to pi color cyan amplitude 0.55

write title in 0.7s
show i from 0 in 1.2s
highlight i in 0.8s
wait 0.5s`,
},
{
  id: "wave-surface",
  title: "Wave Surface",
  description: "3D sampled field rendered as layered wave lines.",
  code: `scene "Wave Surface"
duration = 8
fps = 30

camera orbit radius 5.8 height 3.4 turns 0.42

grid
axes

title "Wave Surface"
subtitle "3D sampled field as layered paths"

wave_surface ws = sin(x)*cos(y) range 3 rows 38 cols 110 color cyan height 0.55 opacity 0.9 guides 14 guideOpacity 0.18 edgeFade 0.35

write title in 0.7s
show ws from 0 in 1.2s
highlight ws in 0.8s
wait 0.6s`,
},
{
  id: "radial-ripples",
  title: "Radial Ripples",
  description: "Circular wave propagation pattern in 3D space.",
  code: `scene "Radial Ripples"
duration = 8
fps = 30

camera orbit radius 6 height 3.5 turns 0.45

grid
axes

title "Radial Wave Field"
subtitle "Circular wave propagation pattern"

wave_surface ripples = sin(5*sqrt(x^2+y^2)) range 3.2 rows 44 cols 120 color white height 0.42 opacity 0.9 guides 16 guideOpacity 0.14 edgeFade 0.42

write title in 0.7s
show ripples from 0 in 1.2s
highlight ripples in 0.8s
wait 0.6s`,
},
{
  id: "saddle-surface",
  title: "Saddle Surface",
  description: "General 3D math surface: z = x² - y².",
  code: `scene "Saddle Surface"
duration = 8
fps = 30

camera orbit radius 5.8 height 3.4 turns 0.42

grid
axes

title "Saddle Surface"
subtitle "A general 3D math surface"

surface saddle = x^2-y^2 range 2 rows 48 cols 130 mode mesh color red height 0.22 meshOpacity 0.9 lineOpacity 0.04 wireframe 1 wireOpacity 0.12 guides 10 guideOpacity 0.08 edgeFade 0.25

write title in 0.7s
show saddle from 0 in 1.2s
highlight saddle in 0.8s
wait 0.6s`,
},
{
  id: "bowl-surface",
  title: "Bowl Surface",
  description: "Paraboloid surface: z = x² + y².",
  code: `scene "Bowl Surface"
duration = 8
fps = 30

camera orbit radius 5.8 height 3.4 turns 0.42

grid
axes

title "Bowl Surface"
subtitle "Paraboloid surface visualization"

surface bowl = x^2+y^2 range 2 rows 48 cols 130 mode mesh color yellow height 0.18 meshOpacity 0.85 lineOpacity 0.03 wireframe 1 wireOpacity 0.1 guides 10 guideOpacity 0.08 edgeFade 0.25

write title in 0.7s
show bowl from 0 in 1.2s
highlight bowl in 0.8s
wait 0.6s`,
},
{
  id: "animated-wave-surface-classic",
  title: "Animated Wave Surface",
  description: "Time-aware procedural wave mesh using t in the expression.",
  code: `scene "Animated Wave Surface"
duration = 10
fps = 30

camera orbit radius 6.2 height 3.8 turns 0.08

grid
axes

title "Animated Wave Surface"
subtitle "z = sin(4x - 8t) + 0.55cos(3y + 6t)"

wave_surface ws = sin(4*x - 8*t) + 0.55*cos(3*y + 6*t) range 3.2 rows 52 cols 140 mode mesh color cyan height 0.42 meshOpacity 0.9 lineOpacity 0.02 wireframe 1 wireOpacity 0.08 guides 4 guideOpacity 0.04 edgeFade 0.18 animate

write title in 0.7s
show ws from 0 in 0.4s
wait 8.8s`,
},
{
  id: "animated-radial-ripples",
  title: "Animated Radial Ripples",
  description: "Radial wave propagation using sqrt(x²+y²)-t.",
  code: `scene "Animated Radial Ripples"
duration = 10
fps = 30

camera orbit radius 6.3 height 3.9 turns 0.08

grid
axes

title "Animated Radial Ripples"
subtitle "Circular wave propagation"

wave_surface ripples = sin(7*sqrt(x^2+y^2) - 10*t) range 3.4 rows 54 cols 150 mode mesh color white height 0.36 meshOpacity 0.92 lineOpacity 0.01 wireframe 1 wireOpacity 0.06 guides 0 edgeFade 0.12 animate

write title in 0.7s
show ripples from 0 in 0.4s
wait 8.8s`,
},
{
  id: "animated-point-wave",
  title: "Animated Point Wave",
  description: "Point-cloud wave field animated by t.",
  code: `scene "Animated Point Wave"
duration = 10
fps = 30

camera orbit radius 6.3 height 3.9 turns 0.08

grid
axes

title "Animated Point Wave"
subtitle "Point-cloud wave field"

wave_surface dots = sin(7*sqrt(x^2+y^2) - 10*t) range 3.4 rows 70 cols 90 mode dots color white height 0.36 pointSize 0.028 pointOpacity 0.95 animate

write title in 0.7s
show dots from 0 in 0.4s
wait 8.8s`,
},
{
  id: "animated-wave-surface",
  title: "Animated Wave Surface",
  description: "Time-aware mesh wave using t in the expression.",
  code: `scene "Animated Wave Surface"
duration = 10
fps = 30

camera orbit radius 6.2 height 3.8 turns 0.08

grid
axes

title "Animated Wave Surface"
subtitle "z = sin(4x - 8t) + 0.55cos(3y + 6t)"

wave_surface ws = sin(4*x - 8*t) + 0.55*cos(3*y + 6*t) range 3.2 rows 52 cols 140 mode mesh color cyan height 0.42 meshOpacity 0.9 lineOpacity 0.02 wireframe 1 wireOpacity 0.08 guides 4 guideOpacity 0.04 edgeFade 0.18 animate

write title in 0.7s
show ws from 0 in 0.4s
wait 8.8s`,
},
{
  id: "animated-math-surface",
  title: "Animated Math Surface",
  description: "General animated surface using z=f(x,y,t).",
  code: `scene "Animated Math Surface"
duration = 10
fps = 30

camera orbit radius 6 height 3.7 turns 0.08

grid
axes

title "Animated Math Surface"
subtitle "Animated z = sin(x + y - 4t) cos(0.7x)"

surface s = sin(x+y-4*t)*cos(0.7*x) range 3 rows 48 cols 130 mode mesh color violet height 0.5 meshOpacity 0.9 lineOpacity 0.02 wireframe 1 wireOpacity 0.08 guides 6 guideOpacity 0.04 edgeFade 0.2 animate

write title in 0.7s
show s from 0 in 0.4s
wait 8.8s`,
},
];

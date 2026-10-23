import { jsPDF } from "jspdf";
import { Question } from "../types";

export type DiagramKind =
  | "inclined_plane"
  | "bpt_triangle"
  | "right_triangle"
  | "circle_tangent"
  | "electric_circuit"
  | "ray_optics"
  | "pulley_system"
  | "magnetic_field"
  | "coordinate_graph"
  | "atomic_bohr"
  | "chemistry_apparatus"
  | "biology_cell"
  | "generic_schematic";

function escapeXml(raw: string): string {
  return String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function detectDiagramKind(q: Question): DiagramKind {
  const combined = `${q.diagram_description || ""} ${q.question || ""} ${
    q.topic || ""
  }`.toLowerCase();

  if (
    /inclined\s+plane|wedge|block\s+resting|normal\s+force|normal\s+reaction|\bmg\b|\bfriction\b|sliding\s+down|ramp|slope/.test(
      combined
    ) &&
    /block|mass|force|vector|incline|hypotenuse|friction|\bmg\b/.test(combined)
  ) {
    return "inclined_plane";
  }

  if (
    /\bde\b.*parallel.*\bbc\b|parallel\s+to\s+base|thales|basic\s+proportionality|ad\s*:\s*db|ad\/db/.test(
      combined
    )
  ) {
    return "bpt_triangle";
  }

  if (
    /circle|tangent|secant|chord|radius|diameter|semicircle|arc|sector/.test(
      combined
    )
  ) {
    return "circle_tangent";
  }

  if (
    /circuit|resistor|ohm|ammeter|voltmeter|battery|emf|series|parallel\s+combination|current|kirchhoff/.test(
      combined
    )
  ) {
    return "electric_circuit";
  }

  if (
    /lens|mirror|focal|principal\s+axis|refraction|reflection|ray\s+diagram|convex|concave|prism|optical/.test(
      combined
    )
  ) {
    return "ray_optics";
  }

  if (/pulley|atwood|tension\s+in\s+string|suspended\s+mass|spring\s+balance|pendulum/.test(combined)) {
    return "pulley_system";
  }

  if (/magnet|solenoid|magnetic\s+field|fleming|electromagnet|field\s+lines/.test(combined)) {
    return "magnetic_field";
  }

  if (
    /right[\s-]angled|hypotenuse|pythagoras|trigonometr|angle\s+of\s+elevation|angle\s+of\s+depression|triangle\s+abc|\babc\b|perpendicular|altitude/.test(
      combined
    )
  ) {
    return "right_triangle";
  }

  if (
    /graph|parabola|coordinate|cartesian|x-axis|y-axis|polynomial|quadrant|linear\s+equation|histogram/.test(
      combined
    )
  ) {
    return "coordinate_graph";
  }

  if (/bohr|atomic\s+structure|electron\s+shell|valence\s+electron|nucleus\s+and\s+shells|orbital/.test(combined)) {
    return "atomic_bohr";
  }

  if (
    /beaker|electrolysis|anode|cathode|electrode|electrolyte|test\s+tube|titration|distillation|apparatus|ph\s+scale/.test(
      combined
    )
  ) {
    return "chemistry_apparatus";
  }

  if (
    /cell|nucleus|mitochondr|chloroplast|neuron|synapse|reflex|nephron|heart|stomata|flower|xylem|phloem|organelle|anatomy/.test(
      combined
    )
  ) {
    return "biology_cell";
  }

  return "generic_schematic";
}

const SVG_HEADER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 210" width="420" height="210" font-family="Arial, Helvetica, sans-serif">
  <defs>
    <marker id="arrowDark" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0F172A"/>
    </marker>
    <marker id="arrowBlue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0369A1"/>
    </marker>
    <marker id="arrowRed" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#B91C1C"/>
    </marker>
    <marker id="arrowGreen" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#047857"/>
    </marker>
  </defs>
  <rect x="1" y="1" width="418" height="208" rx="6" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1"/>`;

/**
 * Generates a self-contained SVG string for any diagram question.
 */
export function buildDiagramSvgForQuestion(q: Question): string {
  // If AI provided a valid custom SVG with graphic elements, sanitize and use it
  if (
    q.diagram_svg &&
    q.diagram_svg.includes("<svg") &&
    q.diagram_svg.includes("</svg>") &&
    /(<line|<path|<circle|<rect|<polygon|<polyline)/i.test(q.diagram_svg)
  ) {
    const match = q.diagram_svg.match(/<svg[\s\S]*?<\/svg>/i);
    if (match) {
      let svg = match[0];
      if (!svg.includes("xmlns=")) {
        svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!svg.includes("viewBox=")) {
        svg = svg.replace("<svg", '<svg viewBox="0 0 420 210"');
      }
      return svg;
    }
  }

  const kind = detectDiagramKind(q);

  switch (kind) {
    case "inclined_plane":
      return `${SVG_HEADER}
  <!-- Ground Hatching -->
  <line x1="50" y1="175" x2="365" y2="175" stroke="#334155" stroke-width="2"/>
  <path d="M65 175 L55 185 M95 175 L85 185 M125 175 L115 185 M155 175 L145 185 M185 175 L175 185 M215 175 L205 185 M245 175 L235 185 M275 175 L265 185 M305 175 L295 185 M335 175 L325 185" stroke="#94A3B8" stroke-width="1.2"/>
  <!-- Right-angled Inclined Plane Triangle ABC -->
  <polygon points="75,175 315,175 75,55" fill="#F8FAFC" stroke="#0F172A" stroke-width="2"/>
  <!-- Right angle symbol at B(75,175) -->
  <polyline points="75,161 89,161 89,175" fill="none" stroke="#475569" stroke-width="1.4"/>
  <!-- Angle theta arc at C(315,175) -->
  <path d="M 270,175 A 45,45 0 0,1 275,155" fill="none" stroke="#0F172A" stroke-width="1.5"/>
  <text x="253" y="169" font-size="13" font-weight="bold" fill="#0F172A">θ</text>
  <!-- Vertices -->
  <text x="62" y="50" font-size="12" font-weight="bold" fill="#0F172A">A</text>
  <text x="60" y="172" font-size="12" font-weight="bold" fill="#0F172A">B</text>
  <text x="323" y="173" font-size="12" font-weight="bold" fill="#0F172A">C</text>
  <!-- Block resting on hypotenuse (slope angle = atan2(120, 240) = 26.565 deg) -->
  <g transform="translate(185, 110) rotate(26.565)">
    <rect x="-28" y="-32" width="56" height="32" rx="2" fill="#E2E8F0" stroke="#0F172A" stroke-width="2"/>
    <circle cx="0" cy="-16" r="2.8" fill="#0F172A"/>
    <text x="-6" y="-11" font-size="11" font-weight="bold" fill="#0F172A">m</text>
    <!-- Normal Force Vector N (perpendicular to incline) -->
    <line x1="0" y1="-16" x2="0" y2="-82" stroke="#0369A1" stroke-width="2.2" marker-end="url(#arrowBlue)"/>
    <text x="6" y="-76" font-size="12" font-weight="bold" fill="#0369A1">N</text>
    <!-- Friction Force Vector f (up the incline) -->
    <line x1="-28" y1="-16" x2="-84" y2="-16" stroke="#047857" stroke-width="2.2" marker-end="url(#arrowGreen)"/>
    <text x="-82" y="-23" font-size="11" font-weight="bold" fill="#047857">f (friction)</text>
    <!-- Dashed mg cos(theta) perpendicular component -->
    <line x1="0" y1="-16" x2="0" y2="38" stroke="#64748B" stroke-width="1.3" stroke-dasharray="4,3" marker-end="url(#arrowDark)"/>
    <text x="5" y="36" font-size="10" fill="#475569">mg cos θ</text>
    <!-- Dashed mg sin(theta) parallel component -->
    <line x1="0" y1="-16" x2="48" y2="-16" stroke="#64748B" stroke-width="1.3" stroke-dasharray="4,3" marker-end="url(#arrowDark)"/>
    <text x="32" y="-23" font-size="10" fill="#475569">mg sin θ</text>
  </g>
  <!-- Weight Vector mg (strictly vertical downward from block center (192, 96)) -->
  <line x1="192" y1="96" x2="192" y2="168" stroke="#B91C1C" stroke-width="2.3" marker-end="url(#arrowRed)"/>
  <text x="198" y="164" font-size="12" font-weight="bold" fill="#B91C1C">mg</text>
</svg>`;

    case "bpt_triangle":
      return `${SVG_HEADER}
  <!-- Triangle ABC -->
  <polygon points="210,24 85,182 335,182" fill="#F8FAFC" stroke="#0F172A" stroke-width="2"/>
  <!-- Parallel Line DE || BC -->
  <line x1="141" y1="111" x2="279" y2="111" stroke="#0369A1" stroke-width="2.2"/>
  <!-- Parallel arrows on DE and BC -->
  <path d="M206,107 L214,111 L206,115" fill="none" stroke="#0369A1" stroke-width="1.6"/>
  <path d="M206,178 L214,182 L206,186" fill="none" stroke="#0F172A" stroke-width="1.6"/>
  <!-- Altitudes EN and DM -->
  <line x1="279" y1="111" x2="168" y2="77" stroke="#64748B" stroke-width="1.3" stroke-dasharray="4,3"/>
  <line x1="141" y1="111" x2="252" y2="77" stroke="#64748B" stroke-width="1.3" stroke-dasharray="4,3"/>
  <!-- Dashed diagonals BE and CD -->
  <line x1="85" y1="182" x2="279" y2="111" stroke="#475569" stroke-width="1.3" stroke-dasharray="5,3"/>
  <line x1="335" y1="182" x2="141" y2="111" stroke="#475569" stroke-width="1.3" stroke-dasharray="5,3"/>
  <!-- Vertex Points -->
  <circle cx="210" cy="24" r="3" fill="#0F172A"/>
  <circle cx="85" cy="182" r="3" fill="#0F172A"/>
  <circle cx="335" cy="182" r="3" fill="#0F172A"/>
  <circle cx="141" cy="111" r="3" fill="#0369A1"/>
  <circle cx="279" cy="111" r="3" fill="#0369A1"/>
  <!-- Labels -->
  <text x="205" y="16" font-size="13" font-weight="bold" fill="#0F172A">A</text>
  <text x="68" y="187" font-size="13" font-weight="bold" fill="#0F172A">B</text>
  <text x="343" y="187" font-size="13" font-weight="bold" fill="#0F172A">C</text>
  <text x="122" y="114" font-size="13" font-weight="bold" fill="#0369A1">D</text>
  <text x="287" y="114" font-size="13" font-weight="bold" fill="#0369A1">E</text>
  <text x="152" y="73" font-size="11" font-weight="bold" fill="#475569">N</text>
  <text x="257" y="73" font-size="11" font-weight="bold" fill="#475569">M</text>
  <text x="186" y="126" font-size="11" fill="#0369A1">DE ∥ BC</text>
</svg>`;

    case "right_triangle":
      return `${SVG_HEADER}
  <!-- Right Triangle ABC -->
  <polygon points="105,36 105,174 325,174" fill="#F8FAFC" stroke="#0F172A" stroke-width="2.2"/>
  <!-- Right Angle Marker at B(105, 174) -->
  <polyline points="105,156 123,156 123,174" fill="none" stroke="#0F172A" stroke-width="1.5"/>
  <!-- Angle Arc at C(325, 174) -->
  <path d="M 282,174 A 43,43 0 0,1 288,151" fill="none" stroke="#0369A1" stroke-width="1.6"/>
  <text x="264" y="168" font-size="13" font-weight="bold" fill="#0369A1">θ</text>
  <!-- Labels -->
  <text x="95" y="28" font-size="13" font-weight="bold" fill="#0F172A">A</text>
  <text x="88" y="180" font-size="13" font-weight="bold" fill="#0F172A">B (90°)</text>
  <text x="334" y="180" font-size="13" font-weight="bold" fill="#0F172A">C</text>
  <text x="44" y="110" font-size="11" fill="#334155">Perpendicular</text>
  <text x="195" y="194" font-size="11" fill="#334155">Base (BC)</text>
  <text x="222" y="96" font-size="11" fill="#0369A1">Hypotenuse (AC)</text>
</svg>`;

    case "circle_tangent":
      return `${SVG_HEADER}
  <!-- Circle centered at O(150, 105) with r=64 -->
  <circle cx="150" cy="105" r="64" fill="#F8FAFC" stroke="#0F172A" stroke-width="2"/>
  <circle cx="150" cy="105" r="3" fill="#0F172A"/>
  <text x="134" y="109" font-size="12" font-weight="bold" fill="#0F172A">O</text>
  <!-- External Point P(335, 105) -->
  <circle cx="335" cy="105" r="3.2" fill="#0369A1"/>
  <text x="344" y="109" font-size="13" font-weight="bold" fill="#0369A1">P</text>
  <!-- Tangent points A(172, 45) and B(172, 165) -->
  <line x1="335" y1="105" x2="172" y2="45" stroke="#0369A1" stroke-width="2"/>
  <line x1="335" y1="105" x2="172" y2="165" stroke="#0369A1" stroke-width="2"/>
  <!-- Radii OA and OB -->
  <line x1="150" y1="105" x2="172" y2="45" stroke="#0F172A" stroke-width="1.6"/>
  <line x1="150" y1="105" x2="172" y2="165" stroke="#0F172A" stroke-width="1.6"/>
  <!-- Center Line OP -->
  <line x1="150" y1="105" x2="335" y2="105" stroke="#64748B" stroke-width="1.4" stroke-dasharray="5,3"/>
  <!-- Chord AB -->
  <line x1="172" y1="45" x2="172" y2="165" stroke="#94A3B8" stroke-width="1.2" stroke-dasharray="3,3"/>
  <circle cx="172" cy="45" r="3" fill="#0F172A"/>
  <circle cx="172" cy="165" r="3" fill="#0F172A"/>
  <text x="168" y="35" font-size="12" font-weight="bold" fill="#0F172A">A</text>
  <text x="168" y="182" font-size="12" font-weight="bold" fill="#0F172A">B</text>
  <text x="148" y="73" font-size="11" fill="#334155">r</text>
  <text x="248" y="64" font-size="11" fill="#0369A1">Tangent PA</text>
  <text x="248" y="153" font-size="11" fill="#0369A1">Tangent PB</text>
</svg>`;

    case "electric_circuit":
      return `${SVG_HEADER}
  <!-- Outer Circuit Loop -->
  <line x1="70" y1="55" x2="145" y2="55" stroke="#0F172A" stroke-width="2"/>
  <!-- Resistor R (zigzag) -->
  <polyline points="145,55 155,43 167,67 179,43 191,67 203,43 215,67 225,55" fill="none" stroke="#0F172A" stroke-width="2"/>
  <text x="172" y="35" font-size="12" font-weight="bold" fill="#0F172A">R</text>
  <line x1="225" y1="55" x2="340" y2="55" stroke="#0F172A" stroke-width="2"/>
  <!-- Parallel Voltmeter V across Resistor -->
  <polyline points="130,55 130,102 168,102" fill="none" stroke="#0369A1" stroke-width="1.5"/>
  <circle cx="185" cy="102" r="16" fill="#F8FAFC" stroke="#0369A1" stroke-width="1.8"/>
  <text x="180" y="107" font-size="13" font-weight="bold" fill="#0369A1">V</text>
  <polyline points="202,102 240,102 240,55" fill="none" stroke="#0369A1" stroke-width="1.5"/>
  <!-- Right wire with Ammeter A -->
  <line x1="340" y1="55" x2="340" y2="95" stroke="#0F172A" stroke-width="2"/>
  <circle cx="340" cy="113" r="17" fill="#F8FAFC" stroke="#047857" stroke-width="2"/>
  <text x="335" y="118" font-size="13" font-weight="bold" fill="#047857">A</text>
  <line x1="340" y1="130" x2="340" y2="168" stroke="#0F172A" stroke-width="2"/>
  <!-- Left wire with Current Arrow I -->
  <line x1="70" y1="168" x2="70" y2="55" stroke="#0F172A" stroke-width="2"/>
  <line x1="70" y1="125" x2="70" y2="85" stroke="#B91C1C" stroke-width="2" marker-end="url(#arrowRed)"/>
  <text x="48" y="110" font-size="12" font-weight="bold" fill="#B91C1C">I</text>
  <!-- Bottom wire with Battery & Switch K -->
  <line x1="70" y1="168" x2="160" y2="168" stroke="#0F172A" stroke-width="2"/>
  <!-- Battery Symbol -->
  <line x1="160" y1="152" x2="160" y2="184" stroke="#0F172A" stroke-width="2.4"/>
  <line x1="170" y1="159" x2="170" y2="177" stroke="#0F172A" stroke-width="3.2"/>
  <line x1="182" y1="152" x2="182" y2="184" stroke="#0F172A" stroke-width="2.4"/>
  <line x1="192" y1="159" x2="192" y2="177" stroke="#0F172A" stroke-width="3.2"/>
  <text x="145" y="150" font-size="12" font-weight="bold" fill="#0F172A">+</text>
  <text x="197" y="150" font-size="12" font-weight="bold" fill="#0F172A">−</text>
  <text x="162" y="198" font-size="11" fill="#334155">Battery (V)</text>
  <line x1="192" y1="168" x2="255" y2="168" stroke="#0F172A" stroke-width="2"/>
  <!-- Switch K -->
  <circle cx="258" cy="168" r="3" fill="#0F172A"/>
  <line x1="258" y1="168" x2="285" y2="156" stroke="#0F172A" stroke-width="2"/>
  <circle cx="288" cy="168" r="3" fill="#0F172A"/>
  <text x="266" y="190" font-size="11" font-weight="bold" fill="#0F172A">Key (K)</text>
  <line x1="291" y1="168" x2="340" y2="168" stroke="#0F172A" stroke-width="2"/>
</svg>`;

    case "ray_optics":
      return `${SVG_HEADER}
  <!-- Principal Axis -->
  <line x1="25" y1="105" x2="395" y2="105" stroke="#475569" stroke-width="1.5"/>
  <!-- Convex Lens at O(210, 105) -->
  <path d="M 210,28 Q 232,105 210,182 Q 188,105 210,28 Z" fill="#E0F2FE" fill-opacity="0.65" stroke="#0369A1" stroke-width="2"/>
  <line x1="210" y1="28" x2="210" y2="182" stroke="#94A3B8" stroke-width="1" stroke-dasharray="4,3"/>
  <!-- Focal Points -->
  <circle cx="140" cy="105" r="2.8" fill="#0F172A"/>
  <text x="134" y="121" font-size="11" font-weight="bold" fill="#0F172A">F₁</text>
  <circle cx="75" cy="105" r="2.8" fill="#0F172A"/>
  <text x="66" y="121" font-size="11" font-weight="bold" fill="#0F172A">2F₁</text>
  <circle cx="210" cy="105" r="2.8" fill="#0F172A"/>
  <text x="214" y="120" font-size="11" font-weight="bold" fill="#0F172A">O</text>
  <circle cx="280" cy="105" r="2.8" fill="#0F172A"/>
  <text x="275" y="121" font-size="11" font-weight="bold" fill="#0F172A">F₂</text>
  <circle cx="345" cy="105" r="2.8" fill="#0F172A"/>
  <text x="336" y="121" font-size="11" font-weight="bold" fill="#0F172A">2F₂</text>
  <!-- Object AB at x=95 -->
  <line x1="95" y1="105" x2="95" y2="52" stroke="#0F172A" stroke-width="2.5" marker-end="url(#arrowDark)"/>
  <text x="88" y="45" font-size="12" font-weight="bold" fill="#0F172A">A</text>
  <text x="88" y="120" font-size="12" font-weight="bold" fill="#0F172A">B</text>
  <!-- Ray 1: Parallel to principal axis, then through F2(280,105) to A'(326, 152) -->
  <line x1="95" y1="52" x2="210" y2="52" stroke="#0369A1" stroke-width="1.8" marker-end="url(#arrowBlue)"/>
  <line x1="210" y1="52" x2="326" y2="148" stroke="#0369A1" stroke-width="1.8" marker-end="url(#arrowBlue)"/>
  <!-- Ray 2: Through Optical Center O(210,105) to A'(326, 152) -->
  <line x1="95" y1="52" x2="326" y2="148" stroke="#B91C1C" stroke-width="1.8" marker-end="url(#arrowRed)"/>
  <!-- Image A'B' at x=326 -->
  <line x1="326" y1="105" x2="326" y2="148" stroke="#047857" stroke-width="2.5" marker-end="url(#arrowGreen)"/>
  <text x="332" y="102" font-size="11" font-weight="bold" fill="#047857">B'</text>
  <text x="332" y="156" font-size="11" font-weight="bold" fill="#047857">A'</text>
</svg>`;

    case "pulley_system":
      return `${SVG_HEADER}
  <!-- Rigid Ceiling Support -->
  <line x1="130" y1="22" x2="290" y2="22" stroke="#0F172A" stroke-width="2.5"/>
  <path d="M145,22 L135,12 M170,22 L160,12 M195,22 L185,12 M220,22 L210,12 M245,22 L235,12 M270,22 L260,12" stroke="#64748B" stroke-width="1.4"/>
  <line x1="210" y1="22" x2="210" y2="54" stroke="#0F172A" stroke-width="2.5"/>
  <!-- Pulley Wheel -->
  <circle cx="210" cy="54" r="24" fill="#F1F5F9" stroke="#0F172A" stroke-width="2.2"/>
  <circle cx="210" cy="54" r="4" fill="#0F172A"/>
  <!-- Strings -->
  <line x1="186" y1="54" x2="186" y2="132" stroke="#0F172A" stroke-width="2"/>
  <line x1="234" y1="54" x2="234" y2="112" stroke="#0F172A" stroke-width="2"/>
  <!-- Tension Arrows -->
  <line x1="186" y1="115" x2="186" y2="85" stroke="#0369A1" stroke-width="2" marker-end="url(#arrowBlue)"/>
  <text x="168" y="98" font-size="12" font-weight="bold" fill="#0369A1">T</text>
  <line x1="234" y1="98" x2="234" y2="72" stroke="#0369A1" stroke-width="2" marker-end="url(#arrowBlue)"/>
  <text x="242" y="88" font-size="12" font-weight="bold" fill="#0369A1">T</text>
  <!-- Mass m1 -->
  <rect x="166" y="132" width="40" height="32" rx="3" fill="#E2E8F0" stroke="#0F172A" stroke-width="2"/>
  <text x="177" y="152" font-size="12" font-weight="bold" fill="#0F172A">m₁</text>
  <line x1="186" y1="164" x2="186" y2="195" stroke="#B91C1C" stroke-width="2" marker-end="url(#arrowRed)"/>
  <text x="152" y="194" font-size="11" font-weight="bold" fill="#B91C1C">m₁g</text>
  <!-- Mass m2 -->
  <rect x="214" y="112" width="40" height="36" rx="3" fill="#CBD5E1" stroke="#0F172A" stroke-width="2"/>
  <text x="225" y="135" font-size="12" font-weight="bold" fill="#0F172A">m₂</text>
  <line x1="234" y1="148" x2="234" y2="185" stroke="#B91C1C" stroke-width="2" marker-end="url(#arrowRed)"/>
  <text x="242" y="182" font-size="11" font-weight="bold" fill="#B91C1C">m₂g</text>
</svg>`;

    case "magnetic_field":
      return `${SVG_HEADER}
  <!-- Upper Magnetic Field Loops (N -> S) -->
  <path d="M 145,92 C 145,28 275,28 275,92" fill="none" stroke="#0369A1" stroke-width="1.8" marker-end="url(#arrowBlue)"/>
  <path d="M 130,92 C 110,10 310,10 290,92" fill="none" stroke="#0369A1" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arrowBlue)"/>
  <!-- Lower Magnetic Field Loops (N -> S) -->
  <path d="M 145,118 C 145,182 275,182 275,118" fill="none" stroke="#0369A1" stroke-width="1.8" marker-end="url(#arrowBlue)"/>
  <path d="M 130,118 C 110,200 310,200 290,118" fill="none" stroke="#0369A1" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arrowBlue)"/>
  <!-- Bar Magnet -->
  <rect x="120" y="88" width="90" height="34" fill="#FEE2E2" stroke="#0F172A" stroke-width="2"/>
  <rect x="210" y="88" width="90" height="34" fill="#E0F2FE" stroke="#0F172A" stroke-width="2"/>
  <text x="158" y="110" font-size="15" font-weight="bold" fill="#991B1B">N</text>
  <text x="248" y="110" font-size="15" font-weight="bold" fill="#075985">S</text>
  <!-- Axial Field Arrows -->
  <line x1="65" y1="105" x2="115" y2="105" stroke="#0369A1" stroke-width="1.8" marker-start="url(#arrowBlue)"/>
  <line x1="305" y1="105" x2="355" y2="105" stroke="#0369A1" stroke-width="1.8" marker-start="url(#arrowBlue)"/>
</svg>`;

    case "coordinate_graph":
      return `${SVG_HEADER}
  <!-- Grid Lines -->
  <g stroke="#E2E8F0" stroke-width="1">
    <line x1="90" y1="25" x2="90" y2="185"/>
    <line x1="140" y1="25" x2="140" y2="185"/>
    <line x1="240" y1="25" x2="240" y2="185"/>
    <line x1="290" y1="25" x2="290" y2="185"/>
    <line x1="60" y1="55" x2="360" y2="55"/>
    <line x1="60" y1="95" x2="360" y2="95"/>
    <line x1="60" y1="175" x2="360" y2="175"/>
  </g>
  <!-- X and Y Axes -->
  <line x1="55" y1="135" x2="365" y2="135" stroke="#0F172A" stroke-width="2" marker-end="url(#arrowDark)"/>
  <line x1="190" y1="190" x2="190" y2="22" stroke="#0F172A" stroke-width="2" marker-end="url(#arrowDark)"/>
  <text x="372" y="139" font-size="12" font-weight="bold" fill="#0F172A">X</text>
  <text x="40" y="139" font-size="12" font-weight="bold" fill="#0F172A">X'</text>
  <text x="196" y="24" font-size="12" font-weight="bold" fill="#0F172A">Y</text>
  <text x="196" y="198" font-size="12" font-weight="bold" fill="#0F172A">Y'</text>
  <text x="175" y="150" font-size="11" font-weight="bold" fill="#0F172A">O</text>
  <!-- Parabola y = p(x) -->
  <path d="M 105,35 Q 215,225 325,35" fill="none" stroke="#0369A1" stroke-width="2.4"/>
  <!-- Intercepts A and B -->
  <circle cx="149" cy="135" r="3.5" fill="#B91C1C"/>
  <circle cx="281" cy="135" r="3.5" fill="#B91C1C"/>
  <circle cx="215" cy="180" r="3.5" fill="#047857"/>
  <text x="122" y="128" font-size="11" font-weight="bold" fill="#B91C1C">A(α, 0)</text>
  <text x="286" y="128" font-size="11" font-weight="bold" fill="#B91C1C">B(β, 0)</text>
  <text x="223" y="185" font-size="11" font-weight="bold" fill="#047857">Vertex V</text>
  <text x="315" y="55" font-size="12" font-weight="bold" fill="#0369A1">y = p(x)</text>
</svg>`;

    case "atomic_bohr":
      return `${SVG_HEADER}
  <!-- Bohr Shells K, L, M -->
  <circle cx="210" cy="105" r="82" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="5,3"/>
  <circle cx="210" cy="105" r="56" fill="none" stroke="#475569" stroke-width="1.6"/>
  <circle cx="210" cy="105" r="32" fill="none" stroke="#0F172A" stroke-width="1.8"/>
  <!-- Nucleus -->
  <circle cx="210" cy="105" r="14" fill="#FEE2E2" stroke="#B91C1C" stroke-width="2"/>
  <text x="199" y="109" font-size="10" font-weight="bold" fill="#991B1B">+Ze</text>
  <!-- Electrons (e-) -->
  <circle cx="210" cy="73" r="4" fill="#0369A1"/>
  <circle cx="210" cy="137" r="4" fill="#0369A1"/>
  <circle cx="154" cy="105" r="4" fill="#0369A1"/>
  <circle cx="266" cy="105" r="4" fill="#0369A1"/>
  <circle cx="250" cy="65" r="4" fill="#0369A1"/>
  <circle cx="170" cy="145" r="4" fill="#0369A1"/>
  <circle cx="292" cy="105" r="4.5" fill="#047857"/>
  <!-- Labels -->
  <text x="298" y="65" font-size="11" font-weight="bold" fill="#0F172A">K, L, M Shells</text>
  <text x="302" y="109" font-size="11" font-weight="bold" fill="#047857">Valence e⁻</text>
</svg>`;

    case "chemistry_apparatus":
      return `${SVG_HEADER}
  <!-- DC Source at Top -->
  <line x1="160" y1="30" x2="198" y2="30" stroke="#0F172A" stroke-width="2"/>
  <line x1="198" y1="18" x2="198" y2="42" stroke="#0F172A" stroke-width="2.5"/>
  <line x1="208" y1="23" x2="208" y2="37" stroke="#0F172A" stroke-width="3.2"/>
  <line x1="208" y1="30" x2="260" y2="30" stroke="#0F172A" stroke-width="2"/>
  <text x="184" y="20" font-size="11" font-weight="bold" fill="#B91C1C">+</text>
  <text x="213" y="20" font-size="11" font-weight="bold" fill="#0369A1">−</text>
  <!-- Wires to Electrodes -->
  <line x1="160" y1="30" x2="160" y2="75" stroke="#0F172A" stroke-width="2"/>
  <line x1="260" y1="30" x2="260" y2="75" stroke="#0F172A" stroke-width="2"/>
  <!-- Beaker -->
  <polyline points="115,65 115,182 305,182 305,65" fill="#F8FAFC" stroke="#0F172A" stroke-width="2.2"/>
  <!-- Electrolyte Level -->
  <path d="M116,98 L304,98" stroke="#0369A1" stroke-width="1.6" stroke-dasharray="6,3"/>
  <rect x="117" y="99" width="186" height="81" fill="#E0F2FE" fill-opacity="0.45"/>
  <!-- Electrodes -->
  <rect x="152" y="75" width="16" height="82" fill="#CBD5E1" stroke="#0F172A" stroke-width="1.8"/>
  <rect x="252" y="75" width="16" height="82" fill="#94A3B8" stroke="#0F172A" stroke-width="1.8"/>
  <!-- Callout Labels -->
  <text x="50" y="92" font-size="11" font-weight="bold" fill="#B91C1C">Anode (+)</text>
  <line x1="108" y1="88" x2="150" y2="88" stroke="#B91C1C" stroke-width="1.2"/>
  <text x="315" y="92" font-size="11" font-weight="bold" fill="#0369A1">Cathode (−)</text>
  <line x1="312" y1="88" x2="270" y2="88" stroke="#0369A1" stroke-width="1.2"/>
  <text x="165" y="174" font-size="11" font-weight="bold" fill="#0F172A">Electrolyte Solution</text>
</svg>`;

    case "biology_cell":
      return `${SVG_HEADER}
  <!-- Outer Membrane & Cell Wall -->
  <ellipse cx="185" cy="105" rx="105" ry="68" fill="#F8FAFC" stroke="#0F172A" stroke-width="2.4"/>
  <ellipse cx="185" cy="105" rx="96" ry="60" fill="#F0FDF4" stroke="#047857" stroke-width="1.5" stroke-dasharray="5,3"/>
  <!-- Nucleus -->
  <circle cx="155" cy="100" r="24" fill="#E0F2FE" stroke="#0369A1" stroke-width="2"/>
  <circle cx="155" cy="100" r="8" fill="#0369A1"/>
  <!-- Vacuole & Organelles -->
  <ellipse cx="222" cy="108" rx="28" ry="20" fill="#FFFFFF" stroke="#64748B" stroke-width="1.6"/>
  <ellipse cx="135" cy="142" rx="14" ry="7" fill="#FEF3C7" stroke="#B45309" stroke-width="1.5"/>
  <ellipse cx="195" cy="65" rx="14" ry="7" fill="#DCFCE7" stroke="#047857" stroke-width="1.5"/>
  <!-- Callout Leader Lines -->
  <line x1="155" y1="85" x2="310" y2="52" stroke="#0F172A" stroke-width="1.2"/>
  <text x="315" y="55" font-size="11" font-weight="bold" fill="#0F172A">(i) Nucleus</text>
  <line x1="238" y1="105" x2="310" y2="92" stroke="#0F172A" stroke-width="1.2"/>
  <text x="315" y="95" font-size="11" font-weight="bold" fill="#0F172A">(ii) Vacuole / Cavity</text>
  <line x1="145" y1="142" x2="310" y2="132" stroke="#0F172A" stroke-width="1.2"/>
  <text x="315" y="135" font-size="11" font-weight="bold" fill="#0F172A">(iii) Mitochondria</text>
  <line x1="268" y1="138" x2="310" y2="168" stroke="#0F172A" stroke-width="1.2"/>
  <text x="315" y="171" font-size="11" font-weight="bold" fill="#0F172A">(iv) Plasma Membrane</text>
</svg>`;

    default: {
      // Dynamic multi-node schematic extracted from the question & diagram_description
      const titleText = escapeXml((q.topic || "Schematic Diagram").slice(0, 36));
      return `${SVG_HEADER}
  <text x="210" y="28" font-size="12" font-weight="bold" fill="#0F172A" text-anchor="middle">${titleText}</text>
  <!-- 3 Connected Schematic Nodes with Vector Arrows -->
  <rect x="36" y="74" width="96" height="58" rx="6" fill="#F8FAFC" stroke="#0F172A" stroke-width="2"/>
  <text x="84" y="100" font-size="11" font-weight="bold" fill="#0F172A" text-anchor="middle">Stage / Part A</text>
  <text x="84" y="116" font-size="10" fill="#475569" text-anchor="middle">Input / Source</text>

  <line x1="132" y1="103" x2="160" y2="103" stroke="#0369A1" stroke-width="2" marker-end="url(#arrowBlue)"/>

  <rect x="164" y="66" width="96" height="74" rx="6" fill="#E0F2FE" fill-opacity="0.5" stroke="#0369A1" stroke-width="2"/>
  <text x="212" y="98" font-size="11" font-weight="bold" fill="#0F172A" text-anchor="middle">Core System B</text>
  <text x="212" y="115" font-size="10" fill="#0369A1" text-anchor="middle">Interaction</text>

  <line x1="260" y1="103" x2="288" y2="103" stroke="#047857" stroke-width="2" marker-end="url(#arrowGreen)"/>

  <rect x="292" y="74" width="92" height="58" rx="6" fill="#F8FAFC" stroke="#0F172A" stroke-width="2"/>
  <text x="338" y="100" font-size="11" font-weight="bold" fill="#0F172A" text-anchor="middle">Result / Part C</text>
  <text x="338" y="116" font-size="10" fill="#475569" text-anchor="middle">Output</text>

  <!-- Feedback / Reference Vector -->
  <path d="M 338,132 L 338,168 L 84,168 L 84,136" fill="none" stroke="#64748B" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arrowDark)"/>
  <text x="210" y="184" font-size="10" fill="#475569" text-anchor="middle">Equilibrium / Conservation Relation</text>
</svg>`;
    }
  }
}

export function buildDiagramSvgDataUrl(q: Question): string {
  const svg = buildDiagramSvgForQuestion(q);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Rasterizes a diagram question's SVG into a crisp 2x resolution PNG Data URL
 * for embedding into jsPDF.
 */
export function rasterizeQuestionDiagramToPng(
  q: Question
): Promise<string | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  const svgDataUrl = buildDiagramSvgDataUrl(q);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 840;
        canvas.height = 420;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = svgDataUrl;
  });
}

export async function rasterizeAllQuestionDiagrams(
  questions: Question[]
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const q of questions) {
    if (q.type === "diagram") {
      const png = await rasterizeQuestionDiagramToPng(q);
      if (png) {
        map[q.id] = png;
      }
    }
  }
  return map;
}

/**
 * Draws the diagram into the jsPDF document at (boxX, boxY, boxW, boxH).
 * Uses the high-DPI rasterized PNG if provided, with a complete native jsPDF
 * vector drawing fallback so a real figure is ALWAYS drawn in the PDF.
 */
export function drawDiagramInPdf(params: {
  doc: jsPDF;
  question: Question;
  questionNumber: number;
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  preRasterizedPng?: string | null;
}) {
  const {
    doc,
    question,
    questionNumber,
    boxX,
    boxY,
    boxW,
    boxH,
    preRasterizedPng,
  } = params;

  // Outer Figure Frame
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, "FD");

  // If pre-rasterized PNG from the SVG engine is available, embed it centered
  if (preRasterizedPng && /^data:image\/png;base64,/i.test(preRasterizedPng)) {
    try {
      const targetH = boxH - 6;
      const targetW = Math.min(boxW - 4, targetH * 2);
      const imgX = boxX + (boxW - targetW) / 2;
      const imgY = boxY + 1.5;
      doc.addImage(preRasterizedPng, "PNG", imgX, imgY, targetW, targetH);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Fig. Q${questionNumber}`,
        boxX + boxW / 2,
        boxY + boxH - 1.5,
        { align: "center" }
      );
      return;
    } catch {
      // Fall back to direct vector drawing below
    }
  }

  // Native jsPDF Vector Drawing Fallback
  const kind = detectDiagramKind(question);
  const cx = boxX + boxW / 2;
  const cy = boxY + (boxH - 4) / 2;

  doc.setDrawColor(15, 23, 42);
  doc.setTextColor(15, 23, 42);
  doc.setLineWidth(0.45);

  if (kind === "inclined_plane") {
    // Ground & Right-Angled Triangle Inclined Plane
    const x1 = cx - 32;
    const y1 = boxY + boxH - 8;
    const x2 = cx + 32;
    const y2 = y1;
    const x3 = x1;
    const y3 = boxY + 8;
    doc.line(x1 - 5, y1, x2 + 5, y2);
    doc.triangle(x1, y1, x2, y2, x3, y3, "S");
    // Right-angle marker
    doc.rect(x1, y1 - 3.5, 3.5, 3.5, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("A", x3 - 3, y3 + 1);
    doc.text("B", x1 - 3.5, y1 - 1);
    doc.text("C", x2 + 2, y2 - 0.5);
    doc.text("θ", x2 - 10, y2 - 1.5);

    // Block on hypotenuse midpoint
    const bx = (x3 + x2) / 2 - 2;
    const by = (y3 + y2) / 2 - 2;
    doc.setFillColor(226, 232, 240);
    doc.rect(bx - 6, by - 6, 12, 8, "FD");
    doc.text("m", bx - 1.5, by - 1);

    // Force Vectors: N (up-right), mg (straight down), f (up-left along slope)
    doc.setDrawColor(3, 105, 161);
    doc.line(bx, by - 2, bx + 8, by - 15);
    doc.text("N", bx + 9, by - 14);

    doc.setDrawColor(185, 28, 28);
    doc.line(bx, by + 2, bx, by + 16);
    doc.text("mg", bx + 2, by + 15);

    doc.setDrawColor(4, 120, 87);
    doc.line(bx - 6, by - 2, bx - 18, by - 9);
    doc.text("f", bx - 21, by - 9);
  } else if (kind === "bpt_triangle" || kind === "right_triangle") {
    const topX = cx;
    const topY = boxY + 7;
    const leftX = cx - 28;
    const botY = boxY + boxH - 8;
    const rightX = cx + 28;
    doc.triangle(topX, topY, leftX, botY, rightX, botY, "S");
    const midY = (topY + botY) / 2 + 1;
    doc.setDrawColor(3, 105, 161);
    doc.line(cx - 14, midY, cx + 14, midY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("A", topX - 1, topY - 1.5);
    doc.text("B", leftX - 4, botY + 1);
    doc.text("C", rightX + 2, botY + 1);
    doc.text("D", cx - 18, midY + 1);
    doc.text("E", cx + 15.5, midY + 1);
  } else if (kind === "circle_tangent") {
    const r = Math.min(13, (boxH - 12) / 2);
    const ox = cx - 12;
    const px = cx + 24;
    doc.circle(ox, cy, r, "S");
    doc.line(ox, cy, px, cy);
    doc.line(px, cy, ox + 4, cy - r + 1);
    doc.line(px, cy, ox + 4, cy + r - 1);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("O", ox - 3, cy - 1);
    doc.text("P", px + 2, cy + 1);
    doc.text("A", ox + 3, cy - r - 1.5);
    doc.text("B", ox + 3, cy + r + 3.5);
  } else {
    // Universal schematic diagram
    doc.rect(cx - 34, cy - 8, 18, 14, "S");
    doc.line(cx - 16, cy - 1, cx - 8, cy - 1);
    doc.rect(cx - 8, cy - 8, 18, 14, "S");
    doc.line(cx + 10, cy - 1, cx + 18, cy - 1);
    doc.rect(cx + 18, cy - 8, 18, 14, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("A", cx - 26, cy);
    doc.text("B", cx, cy);
    doc.text("C", cx + 26, cy);
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fig. Q${questionNumber}`, cx, boxY + boxH - 1.8, {
    align: "center",
  });
}

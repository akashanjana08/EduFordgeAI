import { Question, QuestionTypeConfig } from "../types";

export const DEFAULT_TYPE_CONFIGS: QuestionTypeConfig[] = [
  {
    questionType: "mcq",
    label: "Multiple Choice Questions (MCQ)",
    enabled: true,
    count: 5,
    marksPerQuestion: 1,
    difficulty: "Easy",
    numOptions: 4,
  },
  {
    questionType: "subjective",
    label: "Subjective Questions",
    enabled: true,
    count: 3,
    marksPerQuestion: 3,
    difficulty: "Moderate",
    numOptions: 4,
    subjectiveSubtype: "short_answer",
  },
  {
    questionType: "numeric",
    label: "Numeric Questions",
    enabled: true,
    count: 2,
    marksPerQuestion: 4,
    difficulty: "Moderate",
    numOptions: 4,
  },
  {
    questionType: "diagram",
    label: "Diagram-Based Questions",
    enabled: true,
    count: 1,
    marksPerQuestion: 4,
    difficulty: "Moderate",
    numOptions: 4,
  },
  {
    questionType: "derivation",
    label: "Derivation Questions",
    enabled: true,
    count: 1,
    marksPerQuestion: 4,
    difficulty: "Difficult",
    numOptions: 4,
  },
  {
    questionType: "application",
    label: "Application-Based Questions",
    enabled: true,
    count: 2,
    marksPerQuestion: 5,
    difficulty: "Difficult",
    numOptions: 4,
  },
  {
    questionType: "coding",
    label: "Coding Questions",
    enabled: false,
    count: 2,
    marksPerQuestion: 5,
    difficulty: "Moderate",
    numOptions: 4,
    technicalLanguage: "Python",
    includeSampleInputOutput: true,
    includeTestCases: true,
    includeReferenceSolution: true,
  },
  {
    questionType: "predict_output",
    label: "Predict the Output",
    enabled: false,
    count: 2,
    marksPerQuestion: 2,
    difficulty: "Moderate",
    numOptions: 4,
    technicalLanguage: "Python",
    technicalTopics: "Loops, Functions, Recursion",
  },
  {
    questionType: "debugging",
    label: "Debugging Questions",
    enabled: false,
    count: 1,
    marksPerQuestion: 5,
    difficulty: "Moderate",
    numOptions: 4,
    technicalLanguage: "Python",
    errorType: "Logical",
  },
  {
    questionType: "sql_query",
    label: "SQL Query Questions",
    enabled: false,
    count: 1,
    marksPerQuestion: 5,
    difficulty: "Moderate",
    numOptions: 4,
    technicalLanguage: "SQL",
    sqlDialect: "PostgreSQL",
    technicalTopics: "Joins, CTEs, Window Functions",
  },
  {
    questionType: "code_explanation",
    label: "Code Explanation Questions",
    enabled: false,
    count: 1,
    marksPerQuestion: 3,
    difficulty: "Moderate",
    numOptions: 4,
    technicalLanguage: "Python",
  },
  {
    questionType: "programming_mcq",
    label: "Programming-Based MCQs",
    enabled: false,
    count: 2,
    marksPerQuestion: 1,
    difficulty: "Easy",
    numOptions: 4,
    technicalLanguage: "Python",
  },
  {
    questionType: "scenario_programming",
    label: "Scenario-Based Programming Questions",
    enabled: false,
    count: 1,
    marksPerQuestion: 5,
    difficulty: "Difficult",
    numOptions: 4,
    technicalLanguage: "Language Independent",
  },
];

export const INITIAL_SAMPLE_QUESTIONS: Question[] = [
  {
    id: "Q001",
    type: "mcq",
    question:
      "If the HCF of 65 and 117 is expressible in the form 65m - 117, then the value of m is:",
    options: ["4", "2", "1", "3"],
    correct_answer: "2",
    marks: 1,
    difficulty: "Easy",
    topic: "Real Numbers",
    solution:
      "HCF(65, 117) = 13. Setting 65m - 117 = 13 gives 65m = 130, therefore m = 2.",
  },
  {
    id: "Q002",
    type: "mcq",
    question:
      "If α and β are the zeroes of the quadratic polynomial p(x) = x² - 5x + 6, then the value of α + β - αβ is:",
    options: ["-1", "1", "11", "-11"],
    correct_answer: "-1",
    marks: 1,
    difficulty: "Easy",
    topic: "Polynomials",
    solution:
      "Sum of zeroes (α + β) = 5 and product (αβ) = 6. Hence α + β - αβ = 5 - 6 = -1.",
  },
  {
    id: "Q003",
    type: "mcq",
    question:
      "For what value of k does the pair of linear equations 3x + y = 1 and (2k - 1)x + (k - 1)y = 2k + 1 have no solution?",
    options: ["k = 2", "k = -2", "k = 1", "k = 3"],
    correct_answer: "k = 2",
    marks: 1,
    difficulty: "Easy",
    topic: "Linear Equations",
    solution:
      "For no solution: a1/a2 = b1/b2 != c1/c2 => 3/(2k-1) = 1/(k-1) => 3k - 3 = 2k - 1 => k = 2.",
  },
  {
    id: "Q004",
    type: "mcq",
    question:
      "The 11th term of the Arithmetic Progression (A.P.): -3, -1/2, 2, ... is:",
    options: ["28", "22", "-38", "-48.5"],
    correct_answer: "22",
    marks: 1,
    difficulty: "Easy",
    topic: "Arithmetic Progression",
    solution:
      "First term a = -3, common difference d = -1/2 - (-3) = 2.5. a_11 = a + 10d = -3 + 25 = 22.",
  },
  {
    id: "Q005",
    type: "mcq",
    question:
      "A card is drawn at random from a well-shuffled deck of 52 playing cards. What is the probability of drawing a black face card?",
    options: ["3/26", "3/13", "1/26", "6/13"],
    correct_answer: "3/26",
    marks: 1,
    difficulty: "Easy",
    topic: "Probability",
    solution:
      "There are 6 black face cards (3 in Spades, 3 in Clubs). P(black face card) = 6/52 = 3/26.",
  },
  {
    id: "Q006",
    type: "subjective",
    question:
      "Prove that 3 + 2√5 is an irrational number, given that √5 is irrational.",
    correct_answer: "Proof by contradiction showing (p - 3q)/(2q) = √5",
    marks: 3,
    difficulty: "Moderate",
    topic: "Real Numbers",
    solution:
      "Assume 3 + 2√5 = p/q (coprime integers, q != 0). Rearranging gives √5 = (p - 3q)/(2q). Since p, q are integers, RHS is rational while LHS √5 is irrational—contradiction.",
  },
  {
    id: "Q007",
    type: "subjective",
    question:
      "Explain the relationship between the discriminant D = b² - 4ac of a quadratic equation ax² + bx + c = 0 (a ≠ 0) and the nature of its roots across all three cases.",
    correct_answer:
      "D > 0: two distinct real roots; D = 0: two equal real roots; D < 0: no real roots",
    marks: 3,
    difficulty: "Moderate",
    topic: "Quadratic Equations",
    solution:
      "1 mark for each case: (i) D > 0 gives distinct real roots (-b ± √D)/2a; (ii) D = 0 gives equal real roots -b/2a; (iii) D < 0 yields no real roots.",
  },
  {
    id: "Q008",
    type: "subjective",
    question:
      "Distinguish between Empirical Probability and Theoretical (Classical) Probability with a concrete mathematical illustration for each.",
    correct_answer:
      "Theoretical uses equiprobable outcomes; Empirical uses observed frequency ratio.",
    marks: 3,
    difficulty: "Moderate",
    topic: "Probability",
    solution:
      "State formula P(E) = favorable/total for classical vs P(E) = trials_occurred/total_trials for empirical, plus valid coin/die examples.",
  },
  {
    id: "Q009",
    type: "numeric",
    question:
      "Find the sum of the first 24 terms of the list of numbers whose nth term is given by a_n = 3 + 2n.",
    correct_answer: "672",
    marks: 4,
    difficulty: "Moderate",
    topic: "Arithmetic Progression",
    required_calculation:
      "a_1 = 5, a_2 = 7, d = 2, a_24 = 51; S_24 = (24/2) × (5 + 51) = 12 × 56 = 672",
    solution:
      "Substituting n=1,2,3 gives 5, 7, 9 (an A.P. with a=5, d=2). Using S_n = (n/2)[2a + (n-1)d], S_24 = 12[10 + 23(2)] = 12 × 56 = 672.",
  },
  {
    id: "Q010",
    type: "numeric",
    question:
      "Compute the arithmetic mean and modal class of the following grouped frequency distribution: Class Intervals: 0–10 (f=6), 10–20 (f=11), 20–30 (f=21), 30–40 (f=23), 40–50 (f=14), 50–60 (f=5).",
    correct_answer: "Mean = 30.375, Modal Class = 30–40",
    marks: 4,
    difficulty: "Moderate",
    topic: "Statistics",
    required_calculation:
      "Σf = 80; Midpoints x_i = 5, 15, 25, 35, 45, 55; Σ(f_i x_i) = 2430; Mean = 2430 / 80 = 30.375",
    solution:
      "Total frequency N = 80. Sum of f_i * x_i = 30 + 165 + 525 + 805 + 630 + 275 = 2430. Mean = 2430/80 = 30.375. Highest frequency is 23, so Modal Class is 30–40.",
  },
  {
    id: "Q011",
    type: "diagram",
    question:
      "In ΔABC, a line DE is drawn parallel to base BC intersecting AB at D and AC at E such that AD : DB = 2 : 3. Draw a labeled geometric figure showing the auxiliary altitudes and compute AE if AC = 15 cm.",
    correct_answer: "AE = 6 cm",
    marks: 4,
    difficulty: "Moderate",
    topic: "Triangles",
    diagram_description:
      "Triangle ABC with horizontal line segment DE parallel to base BC (D on AB, E on AC). Perpendicular altitudes EN ⊥ AB and DM ⊥ AC with dashed segments BE and CD.",
    solution:
      "By Basic Proportionality Theorem, AD/DB = AE/EC = 2/3. Thus AE / AC = 2 / (2+3) = 2/5. Given AC = 15 cm, AE = (2/5) × 15 = 6 cm.",
  },
  {
    id: "Q012",
    type: "derivation",
    question:
      "State and prove the Basic Proportionality Theorem (Thales's Theorem): If a line is drawn parallel to one side of a triangle to intersect the other two sides in distinct points, the other two sides are divided in the same ratio.",
    correct_answer: "AD / DB = AE / EC",
    marks: 4,
    difficulty: "Difficult",
    topic: "Triangles",
    required_calculation:
      "Area(ΔADE)/Area(ΔBDE) = AD/DB and Area(ΔADE)/Area(ΔCDE) = AE/EC; since ΔBDE and ΔCDE share base DE between parallels DE and BC, Area(ΔBDE) = Area(ΔCDE).",
    solution:
      "1 mark for statement & construction (join BE, CD and draw altitudes DM ⊥ AC, EN ⊥ AB). 2 marks for area ratios. 1 mark for equating denominators using parallel-line triangle theorem.",
  },
  {
    id: "Q013",
    type: "application",
    question:
      "A motorboat whose speed is 18 km/h in still water takes 1 hour more to go 24 km upstream than to return downstream to the same spot. Formulate the quadratic equation representing this real-world situation and determine the speed of the stream.",
    correct_answer: "Speed of stream = 6 km/h",
    marks: 5,
    difficulty: "Difficult",
    topic: "Quadratic Equations",
    solution:
      "Let stream speed be x km/h. Upstream speed = (18 - x) km/h, downstream speed = (18 + x) km/h. Time equation: 24/(18 - x) - 24/(18 + x) = 1 => 48x = 324 - x² => x² + 48x - 324 = 0 => (x + 54)(x - 6) = 0. Since x > 0, x = 6 km/h.",
  },
  {
    id: "Q014",
    type: "application",
    question:
      "An auditorium has 30 rows of seats. There are 20 seats in the first row, 24 seats in the second row, 28 seats in the third row, and so on. (a) How many seats are there in the 30th row? (b) Find the total seating capacity of the auditorium. (c) If 15% of total seats are reserved for faculty, how many seats remain for students?",
    correct_answer: "(a) 136 seats; (b) 2,340 total seats; (c) 1,989 student seats",
    marks: 5,
    difficulty: "Difficult",
    topic: "Arithmetic Progression",
    solution:
      "(a) a = 20, d = 4, n = 30 => a_30 = 20 + 29(4) = 136 seats. (b) S_30 = (30/2)(20 + 136) = 15 × 156 = 2,340 seats. (c) Student seats = 85% of 2,340 = 0.85 × 2,340 = 1,989 seats.",
  },
];

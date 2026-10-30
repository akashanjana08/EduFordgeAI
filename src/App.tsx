import React, { useEffect, useMemo, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  CreditCard,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Loader2,
  LogOut,
  Menu,
  Shield,
  Sliders,
  Sparkles,
  Upload,
  User,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  AccessEvaluation,
  DifficultyLevel,
  LLMRuntimeConfig,
  MixedDifficultyDistribution,
  PaymentRecord,
  Question,
  QuestionTypeConfig,
  SchoolDetails,
  SubjectiveSubtype,
  SubscriptionPlan,
  TemplateDefinition,
  UsageRecord,
  UserProfile,
} from "./types";
import { readApiJson } from "./services/api";
import {
  DEFAULT_LOGO_SVG_DATA_URL,
  PREDEFINED_TEMPLATES,
  extractTemplateFromUploadedDocumentText,
  mapQuestionsToTemplate,
  parseTopicsInput,
  validateQuestionPaper,
} from "./services/validationAndTemplate";
import {
  DEFAULT_TYPE_CONFIGS,
  INITIAL_SAMPLE_QUESTIONS,
} from "./services/defaultSamplePaper";
import {
  generateAnswerKeyPdf,
  generateStudentQuestionPaperPdf,
  rasterizeLogoToPngDataUrl,
} from "./services/pdfGenerator";
import { rasterizeAllQuestionDiagrams } from "./services/diagramRenderer";
import { PaperPreviewSheet } from "./components/PaperPreviewSheet";
import { QuestionsEditorTab } from "./components/QuestionsEditorTab";
import { PythonSourceModal } from "./components/PythonSourceModal";
import { LandingAndAuthView } from "./components/LandingAndAuthView";
import { SubscriptionAndDashboardView } from "./components/SubscriptionAndDashboardView";
import { AdminOwnerConsoleView } from "./components/AdminOwnerConsoleView";
import { ProfileView } from "./components/ProfileView";

const GRADES = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "Custom Class",
];

const SUBJECTS = [
  "Mathematics",
  "Science",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "Hindi",
  "Social Science",
  "Computer Science",
  "History",
  "Geography",
  "Economics",
  "Business Studies",
  "Accountancy",
  "General Knowledge",
  "Custom Subject",
];

const GEMINI_MODELS = [
  {
    id: "gemini-3.1-flash-lite-preview",
    label: "gemini-3.1-flash-lite-preview (Fast & Cost-Efficient)",
  },
  {
    id: "gemini-3.8-flash",
    label: "gemini-3.8-flash (Balanced Curriculum & STEM)",
  },
  {
    id: "gemini-flash-latest",
    label: "gemini-flash-latest (General Purpose)",
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "gemini-3.1-pro-preview (Advanced Derivations & Math)",
  },
];

type MainTab = "configuration" | "questions" | "preview" | "download";

const AUTH_TOKEN_STORAGE_KEY = "eduforge_session_token";
const CSRF_TOKEN_STORAGE_KEY = "eduforge_csrf_token";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MainTab>(() => {
    const saved = sessionStorage.getItem("eduforge_active_tab");
    if (
      saved === "configuration" ||
      saved === "questions" ||
      saved === "preview" ||
      saved === "download"
    ) {
      return saved;
    }
    return "configuration";
  });
  const [showPythonModal, setShowPythonModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("eduforge_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Authentication & Subscription State
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authUser, setAuthUser] = useState<UserProfile | null>(null);
  const [authToken, setAuthToken] = useState<string>(
    () => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || ""
  );
  const [csrfToken, setCsrfToken] = useState<string>(
    () => localStorage.getItem(CSRF_TOKEN_STORAGE_KEY) || ""
  );
  const [accessEvaluation, setAccessEvaluation] =
    useState<AccessEvaluation | null>(null);
  const [publicPlans, setPublicPlans] = useState<SubscriptionPlan[]>([]);
  const [recentUsage, setRecentUsage] = useState<UsageRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const fetchPublicPlans = async () => {
    try {
      const res = await fetch("/api/public/plans");
      if (res.ok) {
        const data = await readApiJson(res);
        setPublicPlans(data.plans || []);
      }
    } catch {
      // Ignore network errors on initial load
    }
  };

  const refreshAuthSession = async (tokenOverride?: string) => {
    const tokenToUse = tokenOverride ?? authToken;
    if (!tokenToUse) {
      setAuthUser(null);
      setAccessEvaluation(null);
      setAuthLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
        },
      });
      if (!res.ok) {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(CSRF_TOKEN_STORAGE_KEY);
        setAuthToken("");
        setCsrfToken("");
        setAuthUser(null);
        setAccessEvaluation(null);
      } else {
        const data = await readApiJson(res);
        setAuthUser(data.user);
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
          localStorage.setItem(CSRF_TOKEN_STORAGE_KEY, data.csrfToken);
        }
        setAccessEvaluation(data.accessEvaluation);
        setRecentUsage(data.recentUsage || []);
        setPayments(data.payments || []);
      }
    } catch {
      // Keep current state on transient failure
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicPlans();
    refreshAuthSession();
  }, []);

  const handleAuthenticated = (payload: {
    user: UserProfile;
    token: string;
    csrfToken: string;
    accessEvaluation: AccessEvaluation;
  }) => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, payload.token);
    localStorage.setItem(CSRF_TOKEN_STORAGE_KEY, payload.csrfToken);
    setAuthToken(payload.token);
    setCsrfToken(payload.csrfToken);
    setAuthUser(payload.user);
    setAccessEvaluation(payload.accessEvaluation);
    // OWNER goes directly to /question-paper-generator; normal user goes to /dashboard
    navigate(
      payload.user.role === "OWNER"
        ? "/question-paper-generator"
        : "/dashboard",
      { replace: true }
    );
    refreshAuthSession(payload.token);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-CSRF-Token": csrfToken,
        },
      });
    } catch {
      // Ignore logout network error
    }
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(CSRF_TOKEN_STORAGE_KEY);
    setAuthToken("");
    setCsrfToken("");
    setAuthUser(null);
    setAccessEvaluation(null);
    navigate("/login", { replace: true });
  };

  // 1. School Branding State
  const [schoolDetails, setSchoolDetails] = useState<SchoolDetails>({
    schoolName: "ABC International School",
    schoolAddress: "Sector 14, Knowledge Park, New Delhi",
    academicSession: "2026–2027",
    examName: "Annual Examination",
    term: "Term II",
    examDate: "2026-10-15",
    timeDuration: "3 Hours",
    logoDataUrl: DEFAULT_LOGO_SVG_DATA_URL,
    logoFilename: "sample_logo.svg",
    logoDimensions: { width: 160, height: 160 },
  });
  const [logoError, setLogoError] = useState<string | null>(null);

  // 2. Template State
  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string>("template_3_cbse");
  const [uploadedTemplate, setUploadedTemplate] =
    useState<TemplateDefinition | null>(null);
  const [templateUploadMsg, setTemplateUploadMsg] = useState<string | null>(
    null
  );
  const [templateUploadErr, setTemplateUploadErr] = useState<string | null>(
    null
  );

  // 3. Class & Subject State
  const [selectedGradeOption, setSelectedGradeOption] =
    useState<string>("Grade 10");
  const [customClassName, setCustomClassName] = useState<string>("IB Grade 10");
  const [selectedSubjectOption, setSelectedSubjectOption] =
    useState<string>("Mathematics");
  const [customSubjectName, setCustomSubjectName] =
    useState<string>("Applied Mathematics");

  // 4. Marks & Topics State
  const [maximumMarks, setMaximumMarks] = useState<number>(40);
  const [rawTopics, setRawTopics] = useState<string>(
    "Real Numbers\nPolynomials\nLinear Equations\nQuadratic Equations\nArithmetic Progression\nTriangles\nStatistics\nProbability"
  );
  const [allowBroadSyllabus, setAllowBroadSyllabus] = useState<boolean>(false);

  // 5. Question Types & Difficulty Configuration
  const [typeConfigs, setTypeConfigs] =
    useState<QuestionTypeConfig[]>(DEFAULT_TYPE_CONFIGS);
  const [globalDifficulty, setGlobalDifficulty] =
    useState<DifficultyLevel>("Mixed");
  const [mixedDistribution, setMixedDistribution] =
    useState<MixedDifficultyDistribution>({
      easyPct: 30,
      moderatePct: 50,
      difficultPct: 20,
    });

  // 6. Configurable Gemini LLM Parameters
  const [llmConfig, setLlmConfig] = useState<LLMRuntimeConfig>({
    modelName: "gemini-3.1-flash-lite-preview",
    temperature: 0.3,
    maxOutputTokens: 8192,
    batchSize: 15,
  });

  // 7. Generated Questions & PDF State
  const [questions, setQuestions] = useState<Question[]>(() => {
    try {
      const saved = sessionStorage.getItem("eduforge_generated_questions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to initial sample questions
    }
    return INITIAL_SAMPLE_QUESTIONS;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "eduforge_generated_questions",
        JSON.stringify(questions)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [questions]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [generationStatusMsg, setGenerationStatusMsg] = useState<string | null>(
    null
  );
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [previewMode, setPreviewMode] = useState<"student" | "answer_key">(
    "student"
  );
  const [includeAnswerKeyPdf, setIncludeAnswerKeyPdf] = useState<boolean>(true);
  const [studentPdfUrl, setStudentPdfUrl] = useState<string | null>(null);
  const [answerKeyPdfUrl, setAnswerKeyPdfUrl] = useState<string | null>(null);

  const resolvedClassName =
    selectedGradeOption === "Custom Class"
      ? customClassName.trim() || "Grade 10"
      : selectedGradeOption;

  const resolvedSubject =
    selectedSubjectOption === "Custom Subject"
      ? customSubjectName.trim() || "Mathematics"
      : selectedSubjectOption;

  const parsedTopics = useMemo(() => parseTopicsInput(rawTopics), [rawTopics]);

  const activeTemplate: TemplateDefinition = useMemo(() => {
    if (selectedTemplateId === "custom_uploaded" && uploadedTemplate) {
      return uploadedTemplate;
    }
    return (
      PREDEFINED_TEMPLATES.find((t) => t.templateId === selectedTemplateId) ||
      PREDEFINED_TEMPLATES[2]
    );
  }, [selectedTemplateId, uploadedTemplate]);

  const configuredMarksTotal = useMemo(
    () =>
      typeConfigs
        .filter((c) => c.enabled)
        .reduce((sum, c) => sum + c.count * c.marksPerQuestion, 0),
    [typeConfigs]
  );

  const configuredQuestionsTotal = useMemo(
    () =>
      typeConfigs
        .filter((c) => c.enabled)
        .reduce((sum, c) => sum + c.count, 0),
    [typeConfigs]
  );

  const validation = useMemo(
    () =>
      validateQuestionPaper({
        maximumMarks,
        typeConfigs,
        mixedDistribution,
        questions,
      }),
    [maximumMarks, typeConfigs, mixedDistribution, questions]
  );

  const mappedSections = useMemo(
    () => mapQuestionsToTemplate(questions, activeTemplate),
    [questions, activeTemplate]
  );

  // Handlers for Logo Upload with File Type, Size & Dimension Validation
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      setLogoError(
        "Unsupported image format. Please upload PNG, JPG, JPEG, or WEBP."
      );
      return;
    }

    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setLogoError("Logo file exceeds the 10 MB maximum upload limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.width < 32 || img.height < 32) {
          setLogoError(
            `Logo dimensions (${img.width}x${img.height}px) are too small. Minimum is 32x32px.`
          );
          return;
        }
        if (img.width > 2400 || img.height > 2400) {
          setLogoError(
            `Logo dimensions (${img.width}x${img.height}px) exceed maximum 2400x2400px.`
          );
          return;
        }
        let normalizedPngUrl = dataUrl;
        try {
          const canvas = document.createElement("canvas");
          const scale = Math.min(1, 600 / Math.max(img.width, img.height, 1));
          canvas.width = Math.max(32, Math.round(img.width * scale));
          canvas.height = Math.max(32, Math.round(img.height * scale));
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            normalizedPngUrl = canvas.toDataURL("image/png");
          }
        } catch {
          // Keep original dataUrl if canvas conversion is unavailable
        }
        setSchoolDetails((prev) => ({
          ...prev,
          logoDataUrl: normalizedPngUrl,
          logoFilename: file.name,
          logoDimensions: { width: img.width, height: img.height },
        }));
        setStudentPdfUrl(null);
        setAnswerKeyPdfUrl(null);
      };
      img.onerror = () => {
        setLogoError("Uploaded file could not be decoded as a valid image.");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Handler for Custom Question Paper Format Upload (PDF, DOCX, DOC)
  const handleTemplateUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setTemplateUploadErr(null);
    setTemplateUploadMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["pdf", "docx", "doc"].includes(ext)) {
      setTemplateUploadErr(
        "Unsupported file format. Upload a PDF, DOCX, or DOC question paper template."
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setTemplateUploadErr("Template file exceeds the 10 MB limit.");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const rawContent = decoder.decode(buffer);
      // Extract printable ASCII/Unicode runs for structural pattern detection
      const printableRuns =
        rawContent.match(/[\x20-\x7E\r\n]{4,}/g)?.join("\n") || file.name;
      const extracted = extractTemplateFromUploadedDocumentText(
        printableRuns,
        file.name
      );
      setUploadedTemplate(extracted);
      setSelectedTemplateId("custom_uploaded");
      setTemplateUploadMsg(
        `Extracted ${extracted.sections.length} sections and structural metadata from '${file.name}'.`
      );
    } catch (err: any) {
      setTemplateUploadErr(
        err?.message || "Failed to parse uploaded template structure."
      );
    }
  };

  // Preset Marks Configurations (40, 80, 100 Marks)
  const applyMarksPreset = (presetMarks: 40 | 80 | 100) => {
    setMaximumMarks(presetMarks);
    if (presetMarks === 40) {
      setTypeConfigs(DEFAULT_TYPE_CONFIGS);
    } else if (presetMarks === 80) {
      // Exact 80 Marks Breakdown from specification Section 9
      setTypeConfigs([
        {
          questionType: "mcq",
          label: "Multiple Choice Questions (MCQ)",
          enabled: true,
          count: 20,
          marksPerQuestion: 1,
          difficulty: "Easy",
          numOptions: 4,
        },
        {
          questionType: "subjective",
          label: "Subjective Questions",
          enabled: true,
          count: 5,
          marksPerQuestion: 2,
          difficulty: "Moderate",
          numOptions: 4,
          subjectiveSubtype: "short_answer",
        },
        {
          questionType: "numeric",
          label: "Numeric Questions",
          enabled: true,
          count: 5,
          marksPerQuestion: 4,
          difficulty: "Moderate",
          numOptions: 4,
        },
        {
          questionType: "diagram",
          label: "Diagram-Based Questions",
          enabled: false,
          count: 2,
          marksPerQuestion: 5,
          difficulty: "Moderate",
          numOptions: 4,
        },
        {
          questionType: "derivation",
          label: "Derivation Questions",
          enabled: false,
          count: 2,
          marksPerQuestion: 5,
          difficulty: "Difficult",
          numOptions: 4,
        },
        {
          questionType: "application",
          label: "Application-Based Questions",
          enabled: true,
          count: 3,
          marksPerQuestion: 10,
          difficulty: "Difficult",
          numOptions: 4,
        },
      ]);
    } else if (presetMarks === 100) {
      // Exact 100 Marks Breakdown from specification Section 37
      setTypeConfigs([
        {
          questionType: "mcq",
          label: "Multiple Choice Questions (MCQ)",
          enabled: true,
          count: 20,
          marksPerQuestion: 1,
          difficulty: "Easy",
          numOptions: 4,
        },
        {
          questionType: "subjective",
          label: "Subjective Questions",
          enabled: true,
          count: 5,
          marksPerQuestion: 4,
          difficulty: "Moderate",
          numOptions: 4,
          subjectiveSubtype: "long_answer",
        },
        {
          questionType: "numeric",
          label: "Numeric Questions",
          enabled: true,
          count: 5,
          marksPerQuestion: 4,
          difficulty: "Moderate",
          numOptions: 4,
        },
        {
          questionType: "diagram",
          label: "Diagram-Based Questions",
          enabled: false,
          count: 2,
          marksPerQuestion: 5,
          difficulty: "Moderate",
          numOptions: 4,
        },
        {
          questionType: "derivation",
          label: "Derivation Questions",
          enabled: true,
          count: 2,
          marksPerQuestion: 10,
          difficulty: "Difficult",
          numOptions: 4,
        },
        {
          questionType: "application",
          label: "Application-Based Questions",
          enabled: true,
          count: 2,
          marksPerQuestion: 10,
          difficulty: "Difficult",
          numOptions: 4,
        },
      ]);
    }
  };

  // AI Question Paper Generation
  const handleGenerateQuestionPaper = async () => {
    setGenerationError(null);
    if (configuredMarksTotal !== maximumMarks) {
      setGenerationError(
        `Marks Validation Error: Configured question types sum to ${configuredMarksTotal} marks, which does not match Maximum Marks (${maximumMarks}). Adjust counts or marks per question first.`
      );
      return;
    }
    if (parsedTopics.length === 0) {
      setGenerationError("Please enter at least one topic or chapter.");
      return;
    }

    setIsGenerating(true);
    setGenerationStatusMsg(
      `Invoking ${llmConfig.modelName} (temp=${llmConfig.temperature}) for ${configuredQuestionsTotal} questions (${maximumMarks} Marks)...`
    );

    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          className: resolvedClassName,
          subject: resolvedSubject,
          maximumMarks,
          topics: parsedTopics,
          allowBroadSyllabus,
          globalDifficulty,
          mixedDistribution,
          typeConfigs,
          llmConfig,
        }),
      });
      const data = await readApiJson(response);
      if (!response.ok) {
        if (data.accessEvaluation) {
          setAccessEvaluation(data.accessEvaluation);
        }
        throw new Error(data.error || "Failed to generate questions.");
      }

      setQuestions(data.questions || []);
      if (data.accessEvaluation) {
        setAccessEvaluation(data.accessEvaluation);
      }
      if (data.usageRecord) {
        setRecentUsage((prev) => [data.usageRecord, ...prev]);
      }
      setStudentPdfUrl(null);
      setAnswerKeyPdfUrl(null);
      setGenerationStatusMsg(
        `Generated and validated ${data.questions?.length || 0} questions in ${
          data.telemetry?.executionTimeMs || 0
        }ms.`
      );
      setActiveTab("preview");
    } catch (err: any) {
      setGenerationError(
        err?.message || "An unexpected error occurred during AI generation."
      );
      setGenerationStatusMsg(null);
    } finally {
      setIsGenerating(false);
    }
  };

  // Cost-Controlled Single Question Regeneration
  const handleRegenerateSingle = async (targetQuestion: Question) => {
    setGenerationError(null);
    setRegeneratingId(targetQuestion.id);
    try {
      const response = await fetch("/api/regenerate-question", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          className: resolvedClassName,
          subject: resolvedSubject,
          topics: parsedTopics,
          targetQuestion,
          existingQuestions: questions
            .filter((q) => q.id !== targetQuestion.id)
            .map((q) => q.question),
          llmConfig,
        }),
      });
      const data = await readApiJson(response);
      if (!response.ok) {
        if (data.accessEvaluation) {
          setAccessEvaluation(data.accessEvaluation);
        }
        throw new Error(data.error || "Failed to regenerate question.");
      }
      if (data.accessEvaluation) {
        setAccessEvaluation(data.accessEvaluation);
      }
      if (data.question) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === targetQuestion.id ? data.question : q))
        );
        setStudentPdfUrl(null);
        setAnswerKeyPdfUrl(null);
      }
    } catch (err: any) {
      setGenerationError(
        err?.message || `Could not regenerate ${targetQuestion.id}.`
      );
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleBuildPdfs = async () => {
    if (!validation.marksValidated) {
      setGenerationError(
        `Cannot generate final PDF: Generated Total (${validation.actualMarks}) != Maximum Marks (${maximumMarks}).`
      );
      return;
    }

    const [rasterizedLogo, diagramImagesByQuestionId] = await Promise.all([
      rasterizeLogoToPngDataUrl(schoolDetails.logoDataUrl),
      rasterizeAllQuestionDiagrams(questions),
    ]);
    const resolvedLogoPngDataUrl =
      rasterizedLogo?.dataUrl || schoolDetails.logoDataUrl || null;

    const studentBlob = generateStudentQuestionPaperPdf({
      school: schoolDetails,
      className: resolvedClassName,
      subject: resolvedSubject,
      maximumMarks,
      template: activeTemplate,
      sections: mappedSections,
      resolvedLogoPngDataUrl,
      diagramImagesByQuestionId,
    });
    if (studentPdfUrl) URL.revokeObjectURL(studentPdfUrl);
    setStudentPdfUrl(URL.createObjectURL(studentBlob));

    if (includeAnswerKeyPdf) {
      const keyBlob = generateAnswerKeyPdf({
        school: schoolDetails,
        className: resolvedClassName,
        subject: resolvedSubject,
        maximumMarks,
        template: activeTemplate,
        sections: mappedSections,
        resolvedLogoPngDataUrl,
        diagramImagesByQuestionId,
      });
      if (answerKeyPdfUrl) URL.revokeObjectURL(answerKeyPdfUrl);
      setAnswerKeyPdfUrl(URL.createObjectURL(keyBlob));
    } else {
      setAnswerKeyPdfUrl(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white text-xs gap-2.5">
        <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
        <span>Verifying session and subscription authorization...</span>
      </div>
    );
  }

  if (!authUser || !accessEvaluation) {
    const publicAllowedPaths = [
      "/",
      "/login",
      "/signup",
      "/register",
      "/forgot-password",
      "/reset-password",
    ];
    const cleanPath = location.pathname.toLowerCase().replace(/\/+$/, "") || "/";
    if (!publicAllowedPaths.includes(cleanPath)) {
      return <Navigate to="/login" replace />;
    }
    return (
      <Routes>
        <Route
          path="/"
          element={
            <LandingAndAuthView
              plans={publicPlans}
              onAuthenticated={handleAuthenticated}
            />
          }
        />
        <Route
          path="/login"
          element={
            <LandingAndAuthView
              plans={publicPlans}
              onAuthenticated={handleAuthenticated}
            />
          }
        />
        <Route
          path="/signup"
          element={
            <LandingAndAuthView
              plans={publicPlans}
              onAuthenticated={handleAuthenticated}
            />
          }
        />
        <Route
          path="/register"
          element={<Navigate to="/signup" replace />}
        />
        <Route
          path="/forgot-password"
          element={
            <LandingAndAuthView
              plans={publicPlans}
              onAuthenticated={handleAuthenticated}
            />
          }
        />
        <Route
          path="/reset-password"
          element={
            <LandingAndAuthView
              plans={publicPlans}
              onAuthenticated={handleAuthenticated}
            />
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const currentPath =
    location.pathname.toLowerCase().replace(/\/+$/, "") || "/";

  const defaultAuthRedirect =
    authUser.role === "OWNER" ? "/question-paper-generator" : "/dashboard";

  const generatorElement =
    !accessEvaluation.allowed && authUser.role !== "OWNER" ? (
      /* Subscription Required Gate for Normal Users without Active Subscription / Quota */
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-xl w-full bg-white border border-slate-200 rounded-lg p-5 sm:p-8 space-y-5">
          <div className="flex items-start sm:items-center gap-3 text-amber-700">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="text-xs font-mono uppercase">
                Authorization Gate · {accessEvaluation.code}
              </p>
              <h2 className="text-base sm:text-lg font-bold text-slate-950">
                Active Subscription Required for Question Paper Generator
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {accessEvaluation.reason}
          </p>
          <div className="p-3.5 sm:p-4 rounded bg-slate-50 border border-slate-200 text-xs font-mono space-y-1 text-slate-700 break-words">
            <div>
              Account: {authUser.username} (Role: {authUser.role})
            </div>
            <div>
              Current Plan:{" "}
              {accessEvaluation.plan
                ? `${accessEvaluation.plan.name} (${accessEvaluation.plan.code})`
                : "None"}
            </div>
            <div>
              Subscription Status:{" "}
              {accessEvaluation.subscription?.status || "NONE"}
            </div>
            <div>
              Monthly Usage: {accessEvaluation.usageThisMonth} /{" "}
              {accessEvaluation.limitThisMonth ?? 0} question papers
            </div>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 pt-2">
            <button
              onClick={() => navigate("/subscription")}
              className="py-2.5 px-5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-2 min-h-[42px]"
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span>View Plans &amp; Activate Subscription</span>
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="py-2.5 px-4 rounded-md border border-slate-300 text-slate-700 hover:text-slate-950 text-xs font-semibold text-center min-h-[42px]"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    ) : (
      <div className="flex-1 flex flex-col lg:flex-row">
      {/* Left Sidebar: Streamlit-style Workflow Navigation & AI Configuration */}
      <aside className="w-full lg:w-72 shrink-0 bg-slate-900 text-slate-100 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between">
        {/* Mobile & Tablet Compact Control Bar (< 1024px) */}
        <div className="lg:hidden px-4 py-3 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="flex items-center gap-2 text-left text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md px-3 py-2 min-h-[40px]"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Workflow &amp; AI Settings</span>
            {mobileSidebarOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={handleGenerateQuestionPaper}
            disabled={isGenerating}
            className="flex-1 sm:flex-initial py-2 px-4 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 min-h-[40px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Generate Paper</span>
              </>
            )}
          </button>
        </div>

        {/* Collapsible Sidebar Body on Mobile/Tablet, Always Visible on Desktop */}
        <div
          className={`${
            mobileSidebarOpen ? "flex" : "hidden"
          } lg:flex flex-col justify-between flex-1 border-t border-slate-800 lg:border-t-0`}
        >
        <div className="p-4 sm:p-5 space-y-5 sm:space-y-6">
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 font-bold">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white">
                  Question Paper Generator
                </h1>
                <p className="text-[11px] text-slate-400">
                  EduForge AI · Gemini Engine
                </p>
              </div>
            </div>
          </div>

          {/* 7-Step Sidebar Checklist */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Workflow Steps
            </p>
            {[
              { step: "1. School Details", done: Boolean(schoolDetails.schoolName) },
              { step: "2. Paper Template", done: Boolean(activeTemplate) },
              {
                step: "3. Class & Subject",
                done: Boolean(resolvedClassName && resolvedSubject),
              },
              { step: "4. Topics", done: parsedTopics.length > 0 },
              {
                step: "5. Question Configuration",
                done: configuredMarksTotal === maximumMarks,
              },
              { step: "6. AI Configuration", done: Boolean(llmConfig.modelName) },
              { step: "7. Generate & Validate", done: validation.isValid },
            ].map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setActiveTab(idx === 6 ? "questions" : "configuration");
                  setMobileSidebarOpen(false);
                }}
                className="flex items-center justify-between px-2.5 py-2 lg:py-1.5 rounded text-xs cursor-pointer hover:bg-slate-800/80 transition-colors"
              >
                <span className="text-slate-200">{item.step}</span>
                <span
                  className={`text-[11px] font-mono ${
                    item.done ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {item.done ? "✓" : "•"}
                </span>
              </div>
            ))}
          </div>

          {/* 6. Configurable Gemini AI Parameters */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400">
              <Sliders className="w-3.5 h-3.5" />
              <span>6. AI Configuration</span>
            </div>

            <div>
              <label className="block text-[11px] text-slate-300 mb-1">
                GEMINI_MODEL
              </label>
              <select
                value={llmConfig.modelName}
                onChange={(e) =>
                  setLlmConfig({ ...llmConfig, modelName: e.target.value })
                }
                className="w-full rounded bg-slate-800 border border-slate-700 px-2.5 py-2 lg:py-1.5 text-xs text-white font-mono"
              >
                {GEMINI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>GEMINI_TEMPERATURE</span>
                <span className="font-mono text-sky-400">
                  {llmConfig.temperature.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1.2}
                step={0.05}
                value={llmConfig.temperature}
                onChange={(e) =>
                  setLlmConfig({
                    ...llmConfig,
                    temperature: Number(e.target.value),
                  })
                }
                className="w-full accent-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  MAX_TOKENS
                </label>
                <input
                  type="number"
                  min={1024}
                  max={65536}
                  step={512}
                  value={llmConfig.maxOutputTokens}
                  onChange={(e) =>
                    setLlmConfig({
                      ...llmConfig,
                      maxOutputTokens: Number(e.target.value),
                    })
                  }
                  className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1.5 lg:py-1 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  BATCH_SIZE
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={llmConfig.batchSize}
                  onChange={(e) =>
                    setLlmConfig({
                      ...llmConfig,
                      batchSize: Number(e.target.value),
                    })
                  }
                  className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1.5 lg:py-1 text-xs font-mono text-white"
                />
              </div>
            </div>
          </div>

          {/* Primary Sidebar Generate CTA */}
          <button
            onClick={() => {
              setMobileSidebarOpen(false);
              handleGenerateQuestionPaper();
            }}
            disabled={isGenerating}
            className="w-full py-2.5 px-4 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors min-h-[42px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Paper...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                7. Generate Question Paper
              </>
            )}
          </button>
        </div>

        {/* Bottom link to inspect complete Python Streamlit codebase */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <button
            onClick={() => {
              setMobileSidebarOpen(false);
              setShowPythonModal(true);
            }}
            className="w-full py-2 px-3 rounded border border-slate-700 hover:border-sky-500/60 bg-slate-900 text-slate-200 hover:text-white text-xs flex items-center justify-center gap-2 transition-colors min-h-[38px]"
          >
            <Code2 className="w-4 h-4 text-sky-400" />
            <span>View Python / Streamlit Code</span>
          </button>
        </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar & 4 Main Workflow Tabs */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-3.5 sm:pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-950 break-words">
                {schoolDetails.schoolName} — {resolvedSubject} ({resolvedClassName})
              </h2>
              <p className="text-xs text-slate-600 tabular-nums mt-0.5">
                Template: <span className="font-medium">{activeTemplate.templateName}</span>{" "}
                · Configured Marks:{" "}
                <span
                  className={`font-mono font-semibold ${
                    configuredMarksTotal === maximumMarks
                      ? "text-emerald-700"
                      : "text-rose-600"
                  }`}
                >
                  {configuredMarksTotal} / {maximumMarks}
                </span>{" "}
                · Questions:{" "}
                <span className="font-mono font-semibold">
                  {questions.length}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="text-xs text-slate-500 mr-0.5">Marks Presets:</span>
              {([40, 80, 100] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => applyMarksPreset(preset)}
                  className={`px-2.5 py-1.5 sm:py-1 rounded text-xs font-mono font-medium border transition-colors min-h-[34px] sm:min-h-0 ${
                    maximumMarks === preset &&
                    configuredMarksTotal === preset
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {preset}m
                </button>
              ))}
            </div>
          </div>

          {/* 4 Required Main Tabs */}
          <nav className="flex items-center gap-4 sm:gap-6 -mb-px overflow-x-auto no-scrollbar">
            {[
              {
                id: "configuration" as MainTab,
                label: "Configuration",
                icon: Layers,
              },
              {
                id: "questions" as MainTab,
                label: `Generated Questions (${questions.length})`,
                icon: FileSpreadsheet,
              },
              {
                id: "preview" as MainTab,
                label: "Preview",
                icon: BookOpen,
              },
              {
                id: "download" as MainTab,
                label: "Download",
                icon: Download,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors min-h-[42px] ${
                    isActive
                      ? "border-sky-600 text-sky-700"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* Status & Error Notifications */}
        <div className="px-4 sm:px-6 pt-3 sm:pt-4 space-y-2">
          {generationStatusMsg && (
            <div className="p-3 rounded-md bg-sky-50 border border-sky-200 text-xs text-sky-950 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 text-sky-600 animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span className="break-words">{generationStatusMsg}</span>
              </div>
              <button
                onClick={() => setGenerationStatusMsg(null)}
                className="text-slate-400 hover:text-slate-700 text-xs shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {generationError && (
            <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="break-words">{generationError}</span>
              </div>
              <button
                onClick={() => setGenerationError(null)}
                className="text-rose-700 hover:underline shrink-0"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Tab Workspace */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {activeTab === "configuration" && (
            <div className="max-w-6xl space-y-5 sm:space-y-6">
              {/* Section 1: School / Institution Details */}
              <section className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100">
                  1. School / Institution Details
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        School Name *
                      </label>
                      <input
                        type="text"
                        value={schoolDetails.schoolName}
                        onChange={(e) =>
                          setSchoolDetails({
                            ...schoolDetails,
                            schoolName: e.target.value,
                          })
                        }
                        placeholder="ABC International School"
                        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        School Address (Optional)
                      </label>
                      <input
                        type="text"
                        value={schoolDetails.schoolAddress}
                        onChange={(e) =>
                          setSchoolDetails({
                            ...schoolDetails,
                            schoolAddress: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Exam Name
                      </label>
                      <input
                        type="text"
                        value={schoolDetails.examName}
                        onChange={(e) =>
                          setSchoolDetails({
                            ...schoolDetails,
                            examName: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Academic Session
                      </label>
                      <input
                        type="text"
                        value={schoolDetails.academicSession}
                        onChange={(e) =>
                          setSchoolDetails({
                            ...schoolDetails,
                            academicSession: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Term
                      </label>
                      <input
                        type="text"
                        value={schoolDetails.term}
                        onChange={(e) =>
                          setSchoolDetails({
                            ...schoolDetails,
                            term: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Time Duration
                      </label>
                      <input
                        type="text"
                        value={schoolDetails.timeDuration}
                        onChange={(e) =>
                          setSchoolDetails({
                            ...schoolDetails,
                            timeDuration: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>

                  {/* School Logo Upload & Preview */}
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4 flex flex-col items-center justify-center text-center">
                    {schoolDetails.logoDataUrl && (
                      <img
                        src={schoolDetails.logoDataUrl}
                        alt="School Logo Preview"
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 object-contain mb-2 rounded border border-slate-200 bg-white p-1"
                      />
                    )}
                    <p className="text-xs font-semibold text-slate-800">
                      School Logo
                    </p>
                    {schoolDetails.logoDimensions && (
                      <p className="text-[11px] font-mono text-slate-500 mb-2">
                        {schoolDetails.logoFilename} (
                        {schoolDetails.logoDimensions.width}×
                        {schoolDetails.logoDimensions.height}px)
                      </p>
                    )}
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-xs font-medium text-slate-700">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo (PNG/JPG/WEBP)</span>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                    {logoError && (
                      <p className="mt-2 text-[11px] text-rose-600">
                        {logoError}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Section 2: Question Paper Layout & Custom Format Upload */}
              <section className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                  2. Question Paper Layout &amp; Existing Format Upload
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Select Predefined or Uploaded Layout Template
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-medium"
                    >
                      {PREDEFINED_TEMPLATES.map((tpl) => (
                        <option key={tpl.templateId} value={tpl.templateId}>
                          {tpl.templateName}
                        </option>
                      ))}
                      {uploadedTemplate && (
                        <option value="custom_uploaded">
                          {uploadedTemplate.templateName}
                        </option>
                      )}
                    </select>
                    <p className="mt-2 text-xs text-slate-600">
                      {activeTemplate.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {activeTemplate.sections.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-mono"
                        >
                          {s.name}: [{s.questionTypes.join(", ").toUpperCase()}]
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-md p-4">
                    <p className="text-xs font-semibold text-slate-900 mb-1">
                      Upload Existing Question Paper Format (PDF, DOCX, DOC)
                    </p>
                    <p className="text-xs text-slate-600 mb-3">
                      Extracts structural sections, instructions, and marking
                      patterns without copying old questions.
                    </p>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded bg-white border border-slate-300 hover:bg-slate-100 text-xs font-medium text-slate-800">
                      <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span>Upload Format Document (.pdf, .docx, .doc)</span>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc"
                        onChange={handleTemplateUpload}
                        className="hidden"
                      />
                    </label>
                    {templateUploadMsg && (
                      <p className="mt-2 text-xs text-emerald-700 font-medium">
                        ✓ {templateUploadMsg}
                      </p>
                    )}
                    {templateUploadErr && (
                      <p className="mt-2 text-xs text-rose-600">
                        {templateUploadErr}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* Section 3: Class, Subject, Maximum Marks & Topics */}
              <section className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                  3. Class / Grade, Subject, Maximum Marks &amp; Topics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Class / Grade Selection
                    </label>
                    <select
                      value={selectedGradeOption}
                      onChange={(e) => setSelectedGradeOption(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 sm:py-1.5 text-xs"
                    >
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                    {selectedGradeOption === "Custom Class" && (
                      <input
                        type="text"
                        value={customClassName}
                        onChange={(e) => setCustomClassName(e.target.value)}
                        placeholder="e.g., A-Level / IB Grade 8"
                        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Subject Selection
                    </label>
                    <select
                      value={selectedSubjectOption}
                      onChange={(e) => setSelectedSubjectOption(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 sm:py-1.5 text-xs"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {selectedSubjectOption === "Custom Subject" && (
                      <input
                        type="text"
                        value={customSubjectName}
                        onChange={(e) => setCustomSubjectName(e.target.value)}
                        placeholder="Enter custom subject..."
                        className="mt-2 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Maximum Marks *
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={500}
                      value={maximumMarks}
                      onChange={(e) => setMaximumMarks(Number(e.target.value))}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 sm:py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Chapters / Topics (Enter one per line or comma-separated)
                    </label>
                    <span className="text-[11px] font-mono text-slate-500">
                      {parsedTopics.length} Topic(s) Active
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={rawTopics}
                    onChange={(e) => setRawTopics(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-mono"
                  />
                  <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowBroadSyllabus}
                      onChange={(e) => setAllowBroadSyllabus(e.target.checked)}
                      className="rounded border-slate-300 text-sky-600"
                    />
                    <span>
                      Allow broader grade-appropriate syllabus coverage if needed
                    </span>
                  </label>
                </div>
              </section>

              {/* Section 4: Dynamic Question Types & Difficulty Matrix */}
              <section className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      4. Question Types &amp; Marks Allocation Matrix
                    </h3>
                    <p className="text-xs text-slate-600">
                      Enable one or more question types. Total configured marks
                      must exactly equal Maximum Marks ({maximumMarks}).
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-md border text-xs font-mono font-semibold tabular-nums ${
                      configuredMarksTotal === maximumMarks
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-amber-50 border-amber-200 text-amber-900"
                    }`}
                  >
                    Configured Total: {configuredMarksTotal} / {maximumMarks}{" "}
                    Marks ({configuredQuestionsTotal} Questions)
                  </div>
                </div>

                <div className="space-y-3">
                  {typeConfigs.map((cfg, idx) => (
                    <div
                      key={cfg.questionType}
                      className={`p-3.5 rounded-md border transition-colors ${
                        cfg.enabled
                          ? "bg-slate-50/70 border-slate-300"
                          : "bg-white border-slate-200 opacity-65"
                      }`}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-12 gap-3 items-center">
                        <div className="col-span-2 sm:col-span-4 lg:col-span-3 flex items-center justify-between lg:justify-start gap-2.5">
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cfg.enabled}
                              onChange={(e) => {
                                const next = [...typeConfigs];
                                next[idx] = {
                                  ...cfg,
                                  enabled: e.target.checked,
                                };
                                setTypeConfigs(next);
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-sky-600"
                            />
                            <span className="text-xs font-bold text-slate-900">
                              {cfg.label}
                            </span>
                          </label>
                          <span className="lg:hidden font-mono text-xs font-bold text-slate-900 tabular-nums">
                            {cfg.enabled
                              ? `${cfg.count}×${cfg.marksPerQuestion}=${
                                  cfg.count * cfg.marksPerQuestion
                                }m`
                              : "0m"}
                          </span>
                        </div>

                        <div className="col-span-1 lg:col-span-2">
                          <label className="block text-[11px] text-slate-500 mb-0.5">
                            No. of Questions
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            disabled={!cfg.enabled}
                            value={cfg.count}
                            onChange={(e) => {
                              const next = [...typeConfigs];
                              next[idx] = {
                                ...cfg,
                                count: Math.max(1, Number(e.target.value)),
                              };
                              setTypeConfigs(next);
                            }}
                            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 lg:py-1 text-xs font-mono"
                          />
                        </div>

                        <div className="col-span-1 lg:col-span-2">
                          <label className="block text-[11px] text-slate-500 mb-0.5">
                            Marks / Question
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            disabled={!cfg.enabled}
                            value={cfg.marksPerQuestion}
                            onChange={(e) => {
                              const next = [...typeConfigs];
                              next[idx] = {
                                ...cfg,
                                marksPerQuestion: Math.max(
                                  1,
                                  Number(e.target.value)
                                ),
                              };
                              setTypeConfigs(next);
                            }}
                            className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 lg:py-1 text-xs font-mono"
                          />
                        </div>

                        <div className="col-span-1 lg:col-span-2">
                          <label className="block text-[11px] text-slate-500 mb-0.5">
                            Difficulty
                          </label>
                          <select
                            disabled={!cfg.enabled}
                            value={cfg.difficulty}
                            onChange={(e) => {
                              const next = [...typeConfigs];
                              next[idx] = {
                                ...cfg,
                                difficulty: e.target.value as DifficultyLevel,
                              };
                              setTypeConfigs(next);
                            }}
                            className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 lg:py-1 text-xs"
                          >
                            <option value="Easy">Easy</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Difficult">Difficult</option>
                            <option value="Mixed">Mixed</option>
                          </select>
                        </div>

                        <div className="col-span-1 lg:col-span-2">
                          {cfg.questionType === "mcq" && (
                            <>
                              <label className="block text-[11px] text-slate-500 mb-0.5">
                                Options Count
                              </label>
                              <input
                                type="number"
                                min={2}
                                max={6}
                                disabled={!cfg.enabled}
                                value={cfg.numOptions}
                                onChange={(e) => {
                                  const next = [...typeConfigs];
                                  next[idx] = {
                                    ...cfg,
                                    numOptions: Number(e.target.value),
                                  };
                                  setTypeConfigs(next);
                                }}
                                className="w-full rounded border border-slate-300 bg-white px-2.5 py-1.5 lg:py-1 text-xs font-mono"
                              />
                            </>
                          )}
                          {cfg.questionType === "subjective" && (
                            <>
                              <label className="block text-[11px] text-slate-500 mb-0.5">
                                Format
                              </label>
                              <select
                                disabled={!cfg.enabled}
                                value={cfg.subjectiveSubtype || "short_answer"}
                                onChange={(e) => {
                                  const next = [...typeConfigs];
                                  next[idx] = {
                                    ...cfg,
                                    subjectiveSubtype: e.target
                                      .value as SubjectiveSubtype,
                                  };
                                  setTypeConfigs(next);
                                }}
                                className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 lg:py-1 text-xs"
                              >
                                <option value="short_answer">
                                  Short Answer
                                </option>
                                <option value="long_answer">Long Answer</option>
                                <option value="descriptive">Descriptive</option>
                              </select>
                            </>
                          )}
                        </div>

                        <div className="hidden lg:block lg:col-span-1 text-right font-mono text-xs font-bold text-slate-900 tabular-nums">
                          {cfg.enabled
                            ? `${cfg.count}×${cfg.marksPerQuestion}=${
                                cfg.count * cfg.marksPerQuestion
                              }`
                            : "0"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mixed Difficulty Distribution Percentages */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4 items-center">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      Mixed Difficulty Distribution
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Must equal 100% total
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">
                      Easy (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={mixedDistribution.easyPct}
                      onChange={(e) =>
                        setMixedDistribution({
                          ...mixedDistribution,
                          easyPct: Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 sm:py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">
                      Moderate (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={mixedDistribution.moderatePct}
                      onChange={(e) =>
                        setMixedDistribution({
                          ...mixedDistribution,
                          moderatePct: Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 sm:py-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">
                      Difficult (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={mixedDistribution.difficultPct}
                      onChange={(e) =>
                        setMixedDistribution({
                          ...mixedDistribution,
                          difficultPct: Number(e.target.value),
                        })
                      }
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 sm:py-1 text-xs font-mono"
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === "questions" && (
            <div className="max-w-6xl">
              <QuestionsEditorTab
                questions={questions}
                validation={validation}
                isGenerating={isGenerating}
                regeneratingId={regeneratingId}
                onRegenerateAll={handleGenerateQuestionPaper}
                onRegenerateSingle={handleRegenerateSingle}
                onUpdateQuestion={(updated) => {
                  setQuestions((prev) =>
                    prev.map((q) => (q.id === updated.id ? updated : q))
                  );
                  setStudentPdfUrl(null);
                  setAnswerKeyPdfUrl(null);
                }}
                onDeleteQuestion={(id) => {
                  setQuestions((prev) => prev.filter((q) => q.id !== id));
                  setStudentPdfUrl(null);
                  setAnswerKeyPdfUrl(null);
                }}
                onAddManualQuestion={(newQ) => {
                  const nextNum = questions.length + 1;
                  const created: Question = {
                    ...newQ,
                    id: `Q${String(nextNum).padStart(3, "0")}`,
                  };
                  setQuestions((prev) => [...prev, created]);
                  setStudentPdfUrl(null);
                  setAnswerKeyPdfUrl(null);
                }}
              />
            </div>
          )}

          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="max-w-[860px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-3.5 sm:px-4 sm:py-3">
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex items-center gap-2">
                  <button
                    onClick={() => setPreviewMode("student")}
                    className={`px-3 py-2 sm:py-1.5 rounded text-xs font-semibold transition-colors min-h-[38px] sm:min-h-0 ${
                      previewMode === "student"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Student Question Paper View
                  </button>
                  <button
                    onClick={() => setPreviewMode("answer_key")}
                    className={`px-3 py-2 sm:py-1.5 rounded text-xs font-semibold transition-colors min-h-[38px] sm:min-h-0 ${
                      previewMode === "answer_key"
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Confidential Answer Key View
                  </button>
                </div>
                <button
                  onClick={() => {
                    handleBuildPdfs();
                    setActiveTab("download");
                  }}
                  disabled={!validation.marksValidated}
                  className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold text-center min-h-[38px] sm:min-h-0"
                >
                  Proceed to PDF Export
                </button>
              </div>

              <PaperPreviewSheet
                school={schoolDetails}
                className={resolvedClassName}
                subject={resolvedSubject}
                maximumMarks={maximumMarks}
                template={activeTemplate}
                sections={mappedSections}
                viewMode={previewMode}
              />
            </div>
          )}

          {activeTab === "download" && (
            <div className="max-w-4xl space-y-6">
              <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      Printable A4 PDF Generation &amp; Export
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Generates standardized A4 printable documents with school
                      header, right-aligned marks, page-break protection, and
                      isolated Answer Key.
                    </p>
                  </div>
                  <FileCheck2 className="w-7 h-7 text-sky-600 shrink-0" />
                </div>

                {/* Validation Gate Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {validation.checks.map((chk) => (
                    <div
                      key={chk.key}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded border border-slate-200 bg-slate-50 text-xs"
                    >
                      <span className="font-medium text-slate-800">
                        {chk.passed ? "✓" : "✗"} {chk.label}
                      </span>
                      <span className="font-mono text-slate-600 text-right">
                        {chk.detail}
                      </span>
                    </div>
                  ))}
                </div>

                {!validation.marksValidated ? (
                  <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-900">
                    <strong>PDF Generation Blocked:</strong> Generated Total Marks (
                    {validation.actualMarks}) does not match Maximum Marks (
                    {maximumMarks}). Please adjust your questions or configuration
                    until total marks match.
                  </div>
                ) : (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeAnswerKeyPdf}
                        onChange={(e) =>
                          setIncludeAnswerKeyPdf(e.target.checked)
                        }
                        className="w-4 h-4 rounded border-slate-300 text-sky-600"
                      />
                      <span>
                        Generate Separate Confidential Answer Key &amp; Solutions
                        PDF
                      </span>
                    </label>

                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
                      <button
                        onClick={handleBuildPdfs}
                        className="px-4 py-2.5 sm:py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 min-h-[42px]"
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        Generate Final Printable A4 PDFs
                      </button>

                      {studentPdfUrl && (
                        <a
                          href={studentPdfUrl}
                          download={`${resolvedSubject}_${resolvedClassName}_Question_Paper.pdf`.replace(
                            /\s+/g,
                            "_"
                          )}
                          className="px-4 py-2.5 sm:py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 min-h-[42px]"
                        >
                          <Download className="w-4 h-4 shrink-0" />
                          Download Student Question Paper PDF
                        </a>
                      )}

                      {answerKeyPdfUrl && (
                        <a
                          href={answerKeyPdfUrl}
                          download={`${resolvedSubject}_${resolvedClassName}_Answer_Key.pdf`.replace(
                            /\s+/g,
                            "_"
                          )}
                          className="px-4 py-2.5 sm:py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 min-h-[42px]"
                        >
                          <Download className="w-4 h-4 shrink-0" />
                          Download Separate Answer Key PDF
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 pb-16 md:pb-0">
      {/* Top Authenticated Platform Bar with Route Navigation */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 lg:gap-6 min-w-0">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2.5 text-left focus:outline-none shrink-0"
            >
              <div className="w-7 h-7 rounded bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold tracking-tight">
                EduForge AI
              </span>
            </button>

            {/* Desktop & Tablet Primary Navigation */}
            <nav className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => navigate("/dashboard")}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  currentPath === "/dashboard"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => navigate("/question-paper-generator")}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  currentPath.startsWith("/question-paper-generator")
                    ? "bg-sky-600 text-white"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Question Paper Generator</span>
              </button>

              <button
                onClick={() => navigate("/subscription")}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  currentPath === "/subscription"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                <span>Subscription</span>
              </button>

              <button
                onClick={() => navigate("/profile")}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  currentPath === "/profile"
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>Profile</span>
              </button>

              {(authUser.role === "OWNER" || authUser.role === "ADMIN") && (
                <button
                  onClick={() => navigate("/admin")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                    currentPath.startsWith("/admin")
                      ? "bg-slate-800 text-amber-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>Admin</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right User Metadata & Sign Out (Desktop) + Hamburger Toggle (Mobile/Tablet) */}
          <div className="flex items-center gap-2.5 sm:gap-4 text-xs shrink-0">
            <div className="hidden xl:flex text-slate-300 items-center gap-2">
              <span className="font-mono text-slate-400">{location.pathname}</span>
              <span aria-hidden="true">·</span>
              <button
                onClick={() => navigate("/profile")}
                className="font-semibold text-white hover:underline"
              >
                {authUser.username}
              </button>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-sky-400">{authUser.role}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-400">
                {authUser.role === "OWNER"
                  ? "Direct Access"
                  : accessEvaluation.plan
                  ? `${accessEvaluation.plan.code} (${accessEvaluation.subscription?.status}) · ${accessEvaluation.usageThisMonth}/${accessEvaluation.limitThisMonth}`
                  : "No Plan"}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="hidden md:flex py-1.5 px-3 rounded border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-semibold items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>

            {/* Mobile Hamburger Button (< 768px) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-900 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Collapsible Navigation Drawer (< 768px) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800 text-xs">
              <div>
                <span className="font-semibold text-white">
                  {authUser.username}
                </span>{" "}
                <span className="font-mono text-sky-400">({authUser.role})</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                {authUser.role === "OWNER"
                  ? "Direct Unconditional Access"
                  : accessEvaluation.plan
                  ? `${accessEvaluation.plan.code} · ${accessEvaluation.usageThisMonth}/${accessEvaluation.limitThisMonth} papers`
                  : "No Active Plan"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <button
                onClick={() => navigate("/dashboard")}
                className={`w-full px-3 py-2.5 rounded text-xs font-semibold flex items-center gap-2 min-h-[42px] ${
                  currentPath === "/dashboard"
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-sky-400" />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => navigate("/question-paper-generator")}
                className={`w-full px-3 py-2.5 rounded text-xs font-semibold flex items-center gap-2 min-h-[42px] ${
                  currentPath.startsWith("/question-paper-generator")
                    ? "bg-sky-600 text-white"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Question Paper Generator</span>
              </button>
              <button
                onClick={() => navigate("/subscription")}
                className={`w-full px-3 py-2.5 rounded text-xs font-semibold flex items-center gap-2 min-h-[42px] ${
                  currentPath === "/subscription"
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <CreditCard className="w-4 h-4 text-sky-400" />
                <span>Subscription &amp; Billing</span>
              </button>
              <button
                onClick={() => navigate("/profile")}
                className={`w-full px-3 py-2.5 rounded text-xs font-semibold flex items-center gap-2 min-h-[42px] ${
                  currentPath === "/profile"
                    ? "bg-slate-800 text-white"
                    : "text-slate-300 hover:bg-slate-800/60"
                }`}
              >
                <User className="w-4 h-4 text-sky-400" />
                <span>Account Profile</span>
              </button>
              {(authUser.role === "OWNER" || authUser.role === "ADMIN") && (
                <button
                  onClick={() => navigate("/admin")}
                  className={`w-full px-3 py-2.5 rounded text-xs font-semibold flex items-center gap-2 min-h-[42px] ${
                    currentPath.startsWith("/admin")
                      ? "bg-slate-800 text-amber-400"
                      : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Admin &amp; Owner Console</span>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full py-2.5 px-3 rounded border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 min-h-[42px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({authUser.username})</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Authenticated Route Switch */}
      <Routes>
        <Route
          path="/dashboard"
          element={
            <div className="flex-1">
              <SubscriptionAndDashboardView
                activeSubView="dashboard"
                user={authUser}
                authToken={authToken}
                csrfToken={csrfToken}
                plans={publicPlans}
                accessEvaluation={accessEvaluation}
                recentUsage={recentUsage}
                payments={payments}
                onOpenGenerator={() => navigate("/question-paper-generator")}
                onOpenAdminConsole={() => navigate("/admin")}
                onOpenSubscriptionTab={() => navigate("/subscription")}
                onRefreshSession={async () => {
                  await fetchPublicPlans();
                  await refreshAuthSession();
                }}
              />
            </div>
          }
        />

        <Route
          path="/question-paper-generator"
          element={generatorElement}
        />

        <Route
          path="/subscription"
          element={
            <div className="flex-1">
              <SubscriptionAndDashboardView
                activeSubView="subscription"
                user={authUser}
                authToken={authToken}
                csrfToken={csrfToken}
                plans={publicPlans}
                accessEvaluation={accessEvaluation}
                recentUsage={recentUsage}
                payments={payments}
                onOpenGenerator={() => navigate("/question-paper-generator")}
                onOpenAdminConsole={() => navigate("/admin")}
                onOpenSubscriptionTab={() => navigate("/subscription")}
                onRefreshSession={async () => {
                  await fetchPublicPlans();
                  await refreshAuthSession();
                }}
              />
            </div>
          }
        />

        <Route
          path="/profile"
          element={
            <div className="flex-1">
              <ProfileView
                user={authUser}
                authToken={authToken}
                csrfToken={csrfToken}
                accessEvaluation={accessEvaluation}
                onRefreshSession={async () => {
                  await refreshAuthSession();
                }}
                onNavigate={(path) => navigate(path)}
              />
            </div>
          }
        />

        <Route
          path="/admin"
          element={
            authUser.role === "OWNER" || authUser.role === "ADMIN" ? (
              <div className="flex-1">
                <AdminOwnerConsoleView
                  currentUser={authUser}
                  authToken={authToken}
                  csrfToken={csrfToken}
                  onPlansUpdated={async () => {
                    await fetchPublicPlans();
                    await refreshAuthSession();
                  }}
                />
              </div>
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        <Route
          path="*"
          element={<Navigate to={defaultAuthRedirect} replace />}
        />
      </Routes>

      {/* Mobile Sticky Bottom Navigation Bar (< 768px) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-950 text-slate-300 border-t border-slate-800 grid grid-cols-4 px-1 py-1">
        <button
          onClick={() => navigate("/dashboard")}
          className={`flex flex-col items-center justify-center py-1.5 rounded text-[11px] font-medium ${
            currentPath === "/dashboard"
              ? "text-sky-400 font-semibold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => navigate("/question-paper-generator")}
          className={`flex flex-col items-center justify-center py-1.5 rounded text-[11px] font-medium ${
            currentPath.startsWith("/question-paper-generator")
              ? "text-sky-400 font-semibold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4 mb-0.5" />
          <span>Generator</span>
        </button>
        <button
          onClick={() => navigate("/subscription")}
          className={`flex flex-col items-center justify-center py-1.5 rounded text-[11px] font-medium ${
            currentPath === "/subscription"
              ? "text-sky-400 font-semibold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <CreditCard className="w-4 h-4 mb-0.5" />
          <span>Plans</span>
        </button>
        <button
          onClick={() =>
            navigate(
              authUser.role === "OWNER" || authUser.role === "ADMIN"
                ? "/admin"
                : "/profile"
            )
          }
          className={`flex flex-col items-center justify-center py-1.5 rounded text-[11px] font-medium ${
            currentPath.startsWith("/admin") || currentPath === "/profile"
              ? "text-sky-400 font-semibold"
              : "text-slate-400 hover:text-white"
          }`}
        >
          {authUser.role === "OWNER" || authUser.role === "ADMIN" ? (
            <>
              <Shield className="w-4 h-4 mb-0.5" />
              <span>Admin</span>
            </>
          ) : (
            <>
              <User className="w-4 h-4 mb-0.5" />
              <span>Profile</span>
            </>
          )}
        </button>
      </nav>

      <PythonSourceModal
        isOpen={showPythonModal}
        onClose={() => setShowPythonModal(false)}
      />
    </div>
  );
}

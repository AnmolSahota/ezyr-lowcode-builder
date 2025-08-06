import { backendbaseUrl } from "@/baseurl";
import LoadingIndicator from "@/components/LoadingIndicator";
import { useServiceCode } from "@/context/ServiceCodeContext";
import axios from "axios";
import { FileText, Lock, Pencil, Trash, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
const ReactJson = dynamic(() => import("react-json-view"), { ssr: false });

function usePersistedState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored != null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore write errors
    }
  }, [key, state]);

  return [state, setState];
}

export default function DynamicApiBlock({}) {
  const { config } = useServiceCode();
  if (!config) return <p>Loading...</p>;

  const [authValues, setAuthValues] = usePersistedState(
    "DynamicApiBlock.authValues",
    {}
  );
  const [inputValues, setInputValues] = usePersistedState(
    "DynamicApiBlock.inputValues",
    {}
  );
  const [editingId, setEditingId] = usePersistedState(
    "DynamicApiBlock.editingId",
    null
  );
  const [isAuthenticated, setIsAuthenticated] = usePersistedState(
    "DynamicApiBlock.isAuthenticated",
    false
  );

  const [records, setRecords] = useState([]);
  const [dropdownData, setDropdownData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- Utility Functions ---
  const getConfigFields = () =>
    config.inputs?.filter((input) =>
      ["baseId", "tableName", "query"].includes(input.key)
    ) || [];

  const getDataFields = () =>
    config.inputs?.filter(
      (input) => !["baseId", "tableName", "query"].includes(input.key)
    ) || [];

  // --- Value Assembly Functions ---
  const buildDataFields = () => {
    const data = {};
    getDataFields().forEach((field) => {
      let value = inputValues[field.key];
      if (value === undefined || value === "") return;
      switch (field.type) {
        case "number":
          data[field.key] = Number(value);
          break;
        case "json":
          data[field.key] =
            typeof value === "string" ? value : JSON.stringify(value);
          break;
        default:
          data[field.key] = value;
      }
    });
    return data;
  };

  const buildValuesArray = () =>
    getDataFields().map((f) => {
      const v = inputValues[f.key] || "";
      if (f.type === "json") {
        return typeof v === "string" ? v : JSON.stringify(v);
      }
      return v;
    });

  // --- Build credentials object for block/operation ---
  const getCredentials = () => {
    if (config.auth?.type === "API_KEY") {
      return { apiKey: authValues.apiKey };
    }
    if (config.auth?.type === "OAUTH2") {
      return {
        clientId: authValues.clientId,
        secretId: authValues.secretId,
        access_token: authValues.access_token,
        refresh_token: authValues.refresh_token,
        expires_at: authValues.expires_at,
        spreadsheetId: authValues.spreadsheetId,
      };
    }
    return {};
  };

  // --- Block Execute Universal API Call ---
  const callBlockExecute = async (operationType, operationParams = {}) => {
    setLoading(true);
    setError("");
    try {
      // For record actions, merge config.input values, editingId, and special fields
      const params = { ...inputValues, ...operationParams };

      // If possible, helpfully add dataFields/valuesArray for configs that use those
      if (!params.dataFields) params.dataFields = buildDataFields();
      if (!params.valuesArray) params.valuesArray = buildValuesArray();

      if (operationType === "fetch") {
        // Validate inputs marked as required and requiredTogetData
        const missingFields = (config.inputs || [])
          .filter((field) => field.required && field.requiredTogetData)
          .filter((field) => !inputValues[field.key])
          .map((field) => field.label);

        if (missingFields.length > 0) {
          toast.warn(
            `Please fill required fields: ${missingFields.join(", ")}`
          );
          setLoading(false);
          return;
        }

        // Special case for Google Sheets (optional)
        if (config.servicecode === "googlesheets") {
          params.fieldKeys = getDataFields().map((f) => f.key);
        }
      }

      // For Airtable, recordId is needed for update/delete
      if (
        (operationType === "update" || operationType === "delete") &&
        editingId !== null &&
        !params.recordId
      ) {
        params.recordId = editingId;
      }

      // Setup payload as per new backend spec, always POST to the backend
      const res = await axios.post(`${backendbaseUrl}/block/execute`, {
        blockId: config.id,
        operation: operationType,
        params,
        credentials: getCredentials(),
      });

      setLoading(false);
      return res.data;
    } catch (err) {
      setLoading(false);
      const msg =
        err?.response?.data?.error || err.message || "Block execution failed";
      setError(msg);
      toast.error(msg);
      throw err;
    }
  };

  // --- CRUD/Fetch Utilities ---
  const fetchRecords = async () => {
    try {
      const res = await callBlockExecute("fetch");
      const raw = Array.isArray(res)
        ? res
        : res.records || res.data || res.result || [];

      const processed = raw.map((rec) => {
        const newFields = {};

        Object.entries(rec.fields || {}).forEach(([key, value]) => {
          // Only try to parse strings that *look* like JSON
          if (
            typeof value === "string" &&
            (() => {
              const s = value.trim();
              return (
                (s.startsWith("{") && s.endsWith("}")) ||
                (s.startsWith("[") && s.endsWith("]"))
              );
            })()
          ) {
            try {
              newFields[key] = JSON.parse(value);
            } catch (err) {
              console.warn(`Failed to JSON.parse field ${key}:`, err);
              newFields[key] = value; // fallback to the raw string
            }
          } else {
            newFields[key] = value;
          }
        });

        return { ...rec, fields: newFields };
      });
      console.log("processed", processed);

      setRecords(processed);
      toast.success(`Loaded ${processed.length} records`);
    } catch (e) {
      // error already handled
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    const missingFields = getDataFields()
      .filter((f) => f.required)
      .filter((f) => !inputValues[f.key])
      .map((f) => f.label);

    if (missingFields.length > 0) {
      const errorMessage = `Please fill in: ${missingFields.join(", ")}`;
      setError(errorMessage);
      toast.warn(errorMessage);
      return;
    }
    setLoading(true);
    setError("");

    try {
      const operationType = editingId !== null ? "update" : "create";
      const params = editingId !== null ? { recordId: editingId } : {};
      await callBlockExecute(operationType, params);
      toast.success(editingId !== null ? "Record updated!" : "Record added!");
      // Reset inputs & refresh records
      const resetFields = {};
      getDataFields().forEach((f) => (resetFields[f.key] = ""));
      setInputValues((prev) => ({ ...prev, ...resetFields }));
      setEditingId(null);
      await fetchRecords();
    } catch (e) {
      // error handled
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await callBlockExecute("delete", { recordId: id });
      toast.success("Record deleted!");
      await fetchRecords();
    } catch (e) {
      // error handled
    } finally {
      setLoading(false);
    }
  };

  // --- OAuth/Credential Handling ---
  useEffect(() => {
    // On OAuth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      const exchangeCodeForTokens = async () => {
        try {
          setLoading(true);
          const clientId = authValues.clientId;
          const secretId = authValues.secretId;
          const resp = await axios.post(`${config.baseurl}/oauth/callback`, {
            code,
            redirect_uri: config.auth.redirectUri,
            client_id: clientId,
            client_secret: secretId,
          });
          handleOAuthSuccess(resp.data);
          setIsAuthenticated(true);
          toast.success("Successfully authenticated!");
          window.history.replaceState(null, null, window.location.pathname);
        } catch (error) {
          toast.error("Authentication failed. Please try again.");
        } finally {
          setLoading(false);
        }
      };
      exchangeCodeForTokens();
    }

    // Legacy hash-based
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const token = hashParams.get("access_token");
      if (token) {
        handleOAuthSuccess({ access_token: token, token_type: "Bearer" });
        setIsAuthenticated(true);
        toast.success("Successfully authenticated!");
        window.history.replaceState(null, null, window.location.pathname);
      }
    }
  }, []);

  // Proactive token refresh (optional, for OAuth flows)
  useEffect(() => {
    if (
      !isAuthenticated ||
      !authValues.refresh_token ||
      !authValues.clientId ||
      !authValues.secretId
    )
      return;
    const interval = setInterval(() => {
      const expiresAt = authValues.expires_at;
      if (!expiresAt) return;
      // Refresh 10 minutes before expiry
      const bufferTime = 10 * 60 * 1000;
      if (Date.now() > expiresAt - bufferTime) {
        axios
          .post(`${config.baseurl}/oauth/refresh`, {
            refresh_token: authValues.refresh_token,
            client_id: authValues.clientId,
            client_secret: authValues.secretId,
          })
          .then((response) => {
            handleOAuthSuccess(response.data);
            toast.info("Access token refreshed automatically");
          })
          .catch(() => {
            setIsAuthenticated(false);
            setAuthValues({});
            toast.error("Session expired. Please log in again.");
          });
      }
    }, 5 * 60 * 1000); // Check every 5 min
    return () => clearInterval(interval);
  }, [
    isAuthenticated,
    authValues.expires_at,
    authValues.refresh_token,
    authValues.clientId,
    authValues.secretId,
  ]);

  const handleOAuthSuccess = (tokenData) => {
    const expiresIn = tokenData.expires_in || 3600;
    const expiresAt = tokenData.expires_at || Date.now() + expiresIn * 1000;
    setAuthValues((prev) => ({
      ...prev,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      token_type: tokenData.token_type || "Bearer",
      ...(tokenData.client_id ? { clientId: tokenData.client_id } : {}),
      ...(tokenData.client_secret ? { secretId: tokenData.client_secret } : {}),
    }));
  };

  // --- UI Rendering ---
  const resetForm = () => {
    setEditingId(null);
    const resetFields = {};
    getDataFields().forEach((input) => (resetFields[input.key] = ""));
    setInputValues((prev) => ({ ...prev, ...resetFields }));
    setError("");
  };

  const renderInput = (field) => {
    const baseClasses =
      "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200";

    switch (field.type) {
      case "dynamic_dropdown":
        return (
          <select
            value={inputValues[field.key] || ""}
            onChange={(e) => {
              setInputValues((prev) => ({
                ...prev,
                [field.key]: e.target.value,
              }));
              setError("");
            }}
            className={baseClasses}
            disabled={field.dependsOn && !inputValues[field.dependsOn]}
          >
            <option value="">Select {field.label}</option>
            {(dropdownData[field.key] || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case "textarea":
        return (
          <textarea
            rows="3"
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={inputValues[field.key] || ""}
            onChange={(e) => {
              setInputValues((prev) => ({
                ...prev,
                [field.key]: e.target.value,
              }));
              setError("");
            }}
            className={baseClasses}
          />
        );
      case "checkbox":
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={inputValues[field.key] || false}
              onChange={(e) => {
                setInputValues((prev) => ({
                  ...prev,
                  [field.key]: e.target.checked,
                }));
                setError("");
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">{field.label}</label>
          </div>
        );
      case "key_value":
        return (
          <div className="mb-4 flex gap-2 items-center">
            <select
              value={inputValues[field.key]}
              onChange={(e) => {
                setInputValues((prev) => ({
                  ...prev,
                  [field.key]: e.target.value,
                }));
                setError("");
              }}
              className="px-3 py-2 border border-gray-300 rounded"
            >
              <option value="">Select {field.label}</option>
              {(field.keyOptions || []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder={field.valueFieldLabel || "Enter value"}
              value={inputValues.Value}
              onChange={(e) => {
                setInputValues((prev) => ({
                  ...prev,
                  Value: e.target.value,
                }));
                setError("");
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        );
      case "json":
        return (
          <div className="border border-gray-300 rounded p-2">
            <ReactJson
              name={false}
              src={inputValues[field.key] || {}}
              onEdit={(e) => {
                setInputValues((prev) => ({
                  ...prev,
                  [field.key]: e.updated_src,
                }));
              }}
              onAdd={(e) => {
                setInputValues((prev) => ({
                  ...prev,
                  [field.key]: e.updated_src,
                }));
              }}
              onDelete={(e) => {
                setInputValues((prev) => ({
                  ...prev,
                  [field.key]: e.updated_src,
                }));
              }}
              displayDataTypes={false}
              displayObjectSize={false}
              theme="rjv-default"
            />
          </div>
        );
      default:
        return (
          <input
            type={field.type}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={inputValues[field.key] || ""}
            onChange={(e) => {
              setInputValues((prev) => ({
                ...prev,
                [field.key]: e.target.value,
              }));
              setError("");
            }}
            className={baseClasses}
          />
        );
    }
  };

  const getDisplayFields = () => {
    if (config.output?.fields) return config.output.fields;
    return getDataFields().map((field) => field.key);
  };

  // --- Dropdown Dynamic Loaders (unchanged) ---
  const handleFetchDynamicDropdown = async (input) => {
    if (!input.dataSource) return;
    let url = input.dataSource.url;
    Object.keys(inputValues).forEach((key) => {
      url = url.replace(`{${key}}`, inputValues[key]);
    });
    try {
      setLoading(true);
      const headers = {};
      if (config.auth?.type === "API_KEY") {
        const apiKeyField = config.auth.fields[0];
        headers.Authorization = `Bearer ${authValues[apiKeyField.key]}`;
      }
      const response = await axios.get(url, { headers });
      let items = [];
      if (input.dataSource.responseField) {
        items = response.data[input.dataSource.responseField] || [];
      } else if (response.data.bases) {
        items = response.data.bases;
      } else if (response.data.tables) {
        items = response.data.tables;
      } else if (Array.isArray(response.data)) {
        items = response.data;
      } else {
        items = [];
      }
      const options = items.map((item) => ({
        label: item[input.dataSource.labelField],
        value: item[input.dataSource.valueField],
      }));
      setDropdownData((prev) => ({ ...prev, [input.key]: options }));
    } catch (error) {
      toast.error(`Failed to load ${input.label} options`);
      setError(`Failed to load ${input.label} options`);
    } finally {
      setLoading(false);
    }
  };

  // --- Dropdowns: Loaders on mount and when dependencies change ---
  useEffect(() => {
    if (isAuthenticated) {
      config.inputs?.forEach((input) => {
        if (input.type === "dynamic_dropdown" && !input.dependsOn) {
          handleFetchDynamicDropdown(input);
        }
      });
    }
    // eslint-disable-next-line
  }, [isAuthenticated, authValues]);

  useEffect(() => {
    if (isAuthenticated) {
      config.inputs?.forEach((input) => {
        if (input.type === "dynamic_dropdown" && input.dependsOn) {
          const dependencyValue = inputValues[input.dependsOn];
          if (dependencyValue) {
            handleFetchDynamicDropdown(input);
          } else {
            setDropdownData((prev) => ({ ...prev, [input.key]: [] }));
          }
        }
      });
    }
    // eslint-disable-next-line
  }, [inputValues.baseId, isAuthenticated]);

  // --- Authentication Handler (for OAUTH2/Manual) ---
  const handleAuth = () => {
    const authType = config.auth?.type;
    const flowType = config.auth?.flow;
    const missing = (config.auth?.fields || [])
      .filter((f) => f.required && !authValues[f.key])
      .map((f) => f.label);

    // 2. If any are missing, warn and stop here
    if (missing.length > 0) {
      toast.warn(`Please enter: ${missing.join(", ")}`);
      return;
    }

    if (flowType === "REDIRECT" && authType === "OAUTH2") {
      const clientIdField = config.auth.fields?.find(
        (field) => field.key === "clientId"
      );
      const clientId = authValues[clientIdField?.key];

      if (!clientId) {
        const errorMessage = "Please enter your Client ID";
        setError(errorMessage);
        toast.warn(errorMessage);
        return;
      }
      const redirectUri = config.auth.redirectUri;
      const scope = config.auth.scopes;
      const authUrl = `${
        config.auth.authUrl
      }?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(
        scope
      )}&access_type=offline&prompt=consent&include_granted_scopes=true`;
      window.location.href = authUrl;
      return;
    }
    if (config.auth?.fields?.length) {
      const missingFields = config.auth.fields
        .filter((field) => field.required)
        .filter((field) => !authValues[field.key])
        .map((field) => field.label);
      if (missingFields.length > 0) {
        const errorMessage = `Please enter: ${missingFields.join(", ")}`;
        setError(errorMessage);
        toast.warn(errorMessage);
        return;
      }
      setIsAuthenticated(true);
      setError("");
      toast.success("Successfully authenticated!");
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  // ----------- UI ------------
  if (!isAuthenticated) {
    const authFlow = config.auth?.flow;
    const hasFields = config.auth?.fields?.length > 0;
    const isRedirectFlow = authFlow === "REDIRECT";

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl p-0 md:p-8 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Setup Instructions */}
          {config.setupInstructions?.enabled && (
            <div className="md:w-1/2 w-full bg-yellow-50 border-r border-yellow-200 p-6 md:p-8">
              <h2 className="text-xl font-semibold text-yellow-900 mb-4">
                {config.setupInstructions.title || "Setup Instructions"}
              </h2>
              <p className="text-sm text-yellow-800 mb-4">
                {config.setupInstructions.description}
              </p>
              <ol className="list-decimal list-inside space-y-3 text-sm text-yellow-800">
                {config.setupInstructions.steps?.map((step, i) => (
                  <li key={i}>
                    <p className="font-semibold">{step.title}</p>
                    <p className="mb-2">{step.details}</p>
                    {step.fields && (
                      <ul className="mt-2 ml-4 list-disc">
                        {step.fields.map((field, index) => (
                          <li key={index}>
                            <strong>{field.label}</strong> – {field.type}
                            {field.description && ` (${field.description})`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Right: Auth Form */}
          <div className="md:w-1/2 w-full p-6 md:p-8 flex flex-col justify-center">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {config.name}
              </h1>
              <p className="text-gray-600">{config.description}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {hasFields &&
                config.auth.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <input
                      type={field.type}
                      placeholder={`Enter your ${field.label.toLowerCase()}`}
                      value={authValues[field.key] || ""}
                      onChange={(e) => {
                        setAuthValues((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }));
                        setError("");
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                ))}

              <button
                onClick={handleAuth}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Connecting..."
                  : isRedirectFlow
                  ? `Connect to ${config.service}`
                  : `Authenticate ${config.service}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasActions =
    Array.isArray(config?.output?.actions) &&
    config?.output?.actions?.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {config.name}
              </h1>
              <p className="text-gray-600 mt-1">{config.description}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {/* Config fields */}
        {getConfigFields().length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Configuration
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getConfigFields().map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    {renderInput(field)}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <button
                  onClick={fetchRecords}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Loading..." : "Load Records"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auto-load section for services without config fields */}
        {getConfigFields().length === 0 && records.length === 0 && !loading && (
          <div className="mb-8">
            <button
              onClick={fetchRecords}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            >
              Load Data
            </button>
          </div>
        )}
        {/* Add/Edit Form */}
        {getDataFields().length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId !== null ? "Edit Record" : "Add New Record"}
                </h2>
                {editingId !== null && (
                  <button
                    onClick={resetForm}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {getDataFields().map((field) => {
                  if (field.visible === false) return null;
                  return (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      {renderInput(field)}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? "Processing..."
                    : editingId !== null
                    ? "Update Record"
                    : "Add Record"}
                </button>
                {editingId !== null && (
                  <button
                    onClick={resetForm}
                    className="bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Records Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Records</h2>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">
                  {records.length} {records.length === 1 ? "record" : "records"}
                </div>
                <button
                  onClick={fetchRecords}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>
            </div>
          </div>
          {records.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No records found
              </h3>
              <p className="text-gray-500">
                {getConfigFields().length > 0
                  ? "Configure your settings above and load records."
                  : "Load your data or add your first entry above."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {config.servicecode === "googlesheets" && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                    )}
                    {getDisplayFields().map((field) => (
                      <th
                        key={field}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {field}
                      </th>
                    ))}
                    {hasActions && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((rec, idx) => (
                    <tr
                      key={rec.id || idx}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {config.servicecode === "googlesheets" && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {idx + 1}
                        </td>
                      )}
                      {getDisplayFields().map((field) => {
                        const inputDef = config.inputs.find(
                          (i) => i.key === field
                        );
                        const value = rec.fields?.[field];
                        if (inputDef?.type === "json") {
                          return (
                            <td
                              key={field}
                              className="px-6 py-4 align-top whitespace-normal text-sm text-gray-900"
                            >
                              <ReactJson
                                src={value || {}}
                                name={false}
                                collapsed={1}
                                enableClipboard={false}
                                displayDataTypes={false}
                                displayObjectSize={false}
                                theme="rjv-default"
                                style={{
                                  fontSize: "0.8rem",
                                  lineHeight: "1.2",
                                }}
                              />
                            </td>
                          );
                        }
                        return (
                          <td
                            key={field}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                          >
                            {value ?? "-"}
                          </td>
                        );
                      })}
                      {hasActions && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                // Pick the right recordId
                                const recordId =
                                  config.servicecode === "googlesheets"
                                    ? idx
                                    : rec.id;
                                setEditingId(recordId);

                                // Build a fresh inputs object, giving defaults for missing fields:
                                const updatedDataFields = {};
                                getDataFields().forEach((field) => {
                                  const v = rec.fields?.[field.key];
                                  if (v != null) {
                                    // existing value
                                    updatedDataFields[field.key] = v;
                                  } else {
                                    // default: empty string for text, empty object for JSON, etc.
                                    if (field.type === "json") {
                                      updatedDataFields[field.key] = {};
                                    } else {
                                      updatedDataFields[field.key] = "";
                                    }
                                  }
                                });

                                // Merge _all_ inputs so we keep baseId/tableName, and override data
                                setInputValues((prev) => ({
                                  ...prev,
                                  recordId,
                                  ...updatedDataFields,
                                }));

                                // Clear any leftover error
                                setError("");
                              }}
                              className="text-blue-600 hover:text-blue-900 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(
                                  config.servicecode === "googlesheets"
                                    ? idx
                                    : rec.id
                                )
                              }
                              className="text-red-600 hover:text-red-900 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

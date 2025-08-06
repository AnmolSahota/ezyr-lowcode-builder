import { useServiceCode } from "@/context/ServiceCodeContext";
import axios from "axios";
import { FileText, Lock, Pencil, Trash, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function DynamicApiBlock({}) {
  const { config } = useServiceCode();

  if (!config) return <p>Loading...</p>;
  const [authValues, setAuthValues] = useState({});
  const [inputValues, setInputValues] = useState({});
  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [dropdownData, setDropdownData] = useState({});
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Configuration Found
          </h2>
          <p className="text-gray-600">
            Please provide a valid configuration object.
          </p>
        </div>
      </div>
    );
  }

  // Get configuration fields
  const getConfigFields = () => {
    return (
      config.inputs?.filter((input) =>
        ["baseId", "tableName", "query"].includes(input.key)
      ) || []
    );
  };

  // Get data fields (excluding config fields)
  const getDataFields = () => {
    return (
      config.inputs?.filter(
        (input) => !["baseId", "tableName", "query"].includes(input.key)
      ) || []
    );
  };

  // Dynamic URL replacement function
  const replaceUrlPlaceholders = (url, params = {}) => {
    let processedUrl = url;

    // Replace baseurl
    processedUrl = processedUrl.replace("{baseurl}", config.baseurl);

    // Replace other placeholders with values from inputValues, authValues, or params
    const allValues = { ...inputValues, ...authValues, ...params };

    Object.keys(allValues).forEach((key) => {
      const placeholder = `{${key}}`;
      if (processedUrl.includes(placeholder)) {
        processedUrl = processedUrl.replace(
          placeholder,
          encodeURIComponent(allValues[key])
        );
      }
    });

    return processedUrl;
  };

  // Dynamic payload replacement function
  const replacePayloadPlaceholders = (payload, params = {}) => {
    if (!payload) return null;

    let processedPayload = JSON.parse(JSON.stringify(payload));
    const allValues = { ...inputValues, ...authValues, ...params };

    const replacePlaceholders = (obj) => {
      if (typeof obj === "string") {
        // Handle special placeholders
        if (obj === "{dataFields}") {
          const fields = {};
          getDataFields().forEach((field) => {
            const value = inputValues[field.key];
            if (value !== undefined && value !== "") {
              fields[field.key] =
                field.type === "number" ? Number(value) : value;
            }
          });
          return fields;
        }

        if (obj === "{valuesArray}") {
          return getDataFields().map((field) => inputValues[field.key] || "");
        }

        // Replace regular placeholders
        Object.keys(allValues).forEach((key) => {
          const placeholder = `{${key}}`;
          if (obj.includes && obj.includes(placeholder)) {
            obj = obj.replace(placeholder, allValues[key]);
          }
        });
        return obj;
      } else if (Array.isArray(obj)) {
        return obj.map((item) => replacePlaceholders(item));
      } else if (typeof obj === "object" && obj !== null) {
        const result = {};
        Object.keys(obj).forEach((key) => {
          result[key] = replacePlaceholders(obj[key]);
        });
        return result;
      }
      return obj;
    };

    return replacePlaceholders(processedPayload);
  };

  // Dynamic auth header creation
  const getAuthHeader = (operation) => {
    if (!operation) return {};

    if (operation.authMethod === "header") {
      const authKey = operation.authField;
      const authValue = authValues[authKey];

      if (authKey === "apiKey") {
        return { Authorization: `Bearer ${authValue}` };
      } else if (authKey === "access_token") {
        return { Authorization: `Bearer ${authValue}` };
      }
    }

    return {};
  };

  // Generic API call function using axios
  const makeApiCall = async (url, options = {}) => {
    try {
      const axiosConfig = {
        url,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        data: options.body ? options.body : undefined,
      };

      const response = await axios(axiosConfig);
      return response.data;
    } catch (error) {
      console.error("API call error:", error);
      if (error.response) {
        toast.error(
          `API call failed: ${error.response.status} ${error.response.statusText}`
        );
      }
      return;
    }
  };

  // Dynamic operation executor
  const executeOperation = async (operationType, params = {}) => {
    const operation = config.operations?.[operationType];
    if (!operation) {
      toast.error(`Operation ${operationType} not configured`);
      return;
    }

    // Check required fields
    if (operation.requiredFields) {
      const missingFields = operation.requiredFields.filter(
        (field) => !inputValues[field]
      );
      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.join(", ")}`);
        return;
      }
    }

    // Build URL
    const url = replaceUrlPlaceholders(operation.url, params);

    // Build payload
    const payload = replacePayloadPlaceholders(operation.payload, params);

    // Build headers
    const headers = getAuthHeader(operation);

    // Make API call
    const options = {
      method: operation.method,
      headers,
      body: payload,
    };

    const response = await makeApiCall(url, options);

    // Extract data based on responseField
    let data = response;
    if (operation.responseField) {
      data = response[operation.responseField] || [];
    }
    return data;
  };

  // Handle dynamic dropdown loading
  const handleFetchDynamicDropdown = async (input) => {
    if (!input.dataSource) return;

    let url = input.dataSource.url;

    // Replace placeholders with actual input values
    Object.keys(inputValues).forEach((key) => {
      url = url.replace(`{${key}}`, inputValues[key]);
    });

    try {
      setLoading(true);
      const headers = {};

      // Add auth header for API calls
      if (config.auth?.type === "API_KEY") {
        const apiKeyField = config.auth.fields[0];
        headers.Authorization = `Bearer ${authValues[apiKeyField.key]}`;
      }

      const response = await makeApiCall(url, { headers });

      // Handle different response structures dynamically
      let items = [];
      if (input.dataSource.responseField) {
        items = response[input.dataSource.responseField] || [];
      } else if (response.bases) {
        items = response.bases;
      } else if (response.tables) {
        items = response.tables;
      } else if (Array.isArray(response)) {
        items = response;
      } else {
        items = [];
      }

      const options = items.map((item) => ({
        label: item[input.dataSource.labelField],
        value: item[input.dataSource.valueField],
      }));

      setDropdownData((prev) => ({ ...prev, [input.key]: options }));
    } catch (error) {
      console.error("Error loading dynamic dropdown:", error);
      toast.error(`Failed to load ${input.label} options`);
      setError(`Failed to load ${input.label} options`);
    } finally {
      setLoading(false);
    }
  };

  // Load independent dropdowns after authentication
  useEffect(() => {
    if (isAuthenticated) {
      config.inputs?.forEach((input) => {
        if (input.type === "dynamic_dropdown" && !input.dependsOn) {
          handleFetchDynamicDropdown(input);
        }
      });
    }
  }, [isAuthenticated, authValues]);

  // Load dependent dropdowns when their specific dependencies change
  useEffect(() => {
    if (isAuthenticated) {
      config.inputs?.forEach((input) => {
        if (input.type === "dynamic_dropdown" && input.dependsOn) {
          const dependencyValue = inputValues[input.dependsOn];
          if (dependencyValue) {
            handleFetchDynamicDropdown(input);
          } else {
            // Clear dependent dropdown if dependency is cleared
            setDropdownData((prev) => ({ ...prev, [input.key]: [] }));
          }
        }
      });
    }
  }, [inputValues.baseId, isAuthenticated]);

  // Dynamic fetch records function
  const fetchRecords = async () => {
    setError("");
    setLoading(true);

    try {
      const records = await executeOperation("fetch");
      console.log("records", records);

      setRecords(records);
      toast.success(`Successfully loaded ${records.length} records`);
    } catch (error) {
      console.error("Fetch records failed:", error);
      const errorMessage =
        error.message ||
        "Failed to fetch records. Please check your permissions.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic submit function
  const handleSubmit = async () => {
    // Validate required fields
    const missingFields = getDataFields()
      .filter((input) => input.required)
      .filter((input) => !inputValues[input.key])
      .map((input) => input.label);

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

      await executeOperation(operationType, params);

      // Show success message
      const successMessage =
        editingId !== null
          ? "Record updated successfully!"
          : "Record created successfully!";
      toast.success(successMessage);

      // Reset form
      const resetFields = {};
      getDataFields().forEach((input) => {
        resetFields[input.key] = "";
      });
      setInputValues((prev) => ({ ...prev, ...resetFields }));
      setEditingId(null);

      // Refresh records
      await fetchRecords();
    } catch (error) {
      console.error("Submit failed:", error);
      const errorMessage =
        error.message ||
        `Failed to ${editingId !== null ? "update" : "add"} record`;
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic delete function
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      await executeOperation("delete", { recordId: id });
      toast.success("Record deleted successfully!");
      await fetchRecords();
    } catch (error) {
      console.error("Delete failed:", error);
      const errorMessage = error.message || "Failed to delete record";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth authentication for Google services
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);

    // Handle OAuth redirect for Google Sheets and Gmail
    if (hash.includes("access_token")) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const token = hashParams.get("access_token");
      if (token) {
        setAuthValues((prev) => ({
          ...prev,
          access_token: token,
        }));
        setIsAuthenticated(true);
        toast.success("Successfully authenticated!");
        window.history.replaceState(null, null, window.location.pathname);
      }
    } else if (params.get("access_token")) {
      // Handle query parameter format
      const token = params.get("access_token");
      if (token) {
        setAuthValues((prev) => ({
          ...prev,
          access_token: token,
        }));
        setIsAuthenticated(true);
        toast.success("Successfully authenticated!");
        window.history.replaceState({}, document.title, "/");
      }
    }
  }, []);

  // Handle authentication
  const handleAuth = () => {
    const authType = config.auth?.type;
    const flowType = config.auth?.flow;

    if (flowType === "REDIRECT" && authType === "OAUTH2") {
      // Get clientId from auth fields instead of config.auth.clientId
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
      }?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(
        scope
      )}&include_granted_scopes=true&prompt=consent`;

      window.location.href = authUrl;
      return;
    }

    // Handle manual input-based auth (API Key, etc.)
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

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    const resetFields = {};
    getDataFields().forEach((input) => {
      resetFields[input.key] = "";
    });
    setInputValues((prev) => ({ ...prev, ...resetFields }));
    setError("");
  };

  // Render input field based on type
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

  // Get display fields for table (use config output or all data fields)
  const getDisplayFields = () => {
    if (config.output?.fields) {
      return config.output.fields;
    }
    return getDataFields().map((field) => field.key);
  };

  if (!isAuthenticated) {
    const authFlow = config.auth?.flow;
    const hasFields = config.auth?.fields?.length > 0;
    const isManualFlow = authFlow === "MANUAL";
    const isRedirectFlow = authFlow === "REDIRECT";

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
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
            {/* Render input fields for both MANUAL and REDIRECT flows if fields exist */}
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

            {/* Dynamic button for authentication */}
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
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Configuration Section - Show only for services that need it */}
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

        {/* Add/Edit Form - Show only if there are data fields to display */}
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
                {getDataFields().map((field) => (
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
                  {records.map((rec, index) => (
                    <tr
                      key={rec.id || index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {config.servicecode === "googlesheets" && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                      )}
                      {getDisplayFields().map((field) => (
                        <td
                          key={field}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        >
                          {rec.fields ? rec.fields[field] || "-" : "-"}
                        </td>
                      ))}
                      {hasActions && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                const recordId =
                                  config.servicecode === "googlesheets"
                                    ? index
                                    : rec.id;
                                setEditingId(recordId);
                                const updatedInputs = {};
                                getDataFields().forEach((field) => {
                                  if (
                                    rec.fields &&
                                    rec.fields[field.key] !== undefined
                                  ) {
                                    updatedInputs[field.key] =
                                      rec.fields[field.key];
                                  }
                                });
                                setInputValues((prev) => ({
                                  ...prev,
                                  ...updatedInputs,
                                }));
                              }}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(
                                  config.servicecode === "googlesheets"
                                    ? index
                                    : rec.id
                                )
                              }
                              className="text-red-600 hover:text-red-900 transition-colors"
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

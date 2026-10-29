const FREE_ROUTER = "openrouter/free";

function isZeroPrice(value) {
  return Number.isFinite(Number(value)) && Number(value) === 0;
}

function hasUnexpiredModel(model, now) {
  if (!model.expiration_date) return true;
  const expiry = Date.parse(model.expiration_date);
  return Number.isFinite(expiry) && expiry > now;
}

export function selectOpenRouterFreeModels(models, preferredModel, now = Date.now(), fallbackModel) {
  const eligible = (Array.isArray(models) ? models : []).filter((model) => {
    const modalities = model?.architecture?.input_modalities;
    const parameters = model?.supported_parameters;
    return typeof model?.id === "string"
      && model.id.endsWith(":free")
      && Array.isArray(modalities)
      && modalities.includes("image")
      && Array.isArray(parameters)
      && (parameters.includes("structured_outputs") || parameters.includes("response_format"))
      && isZeroPrice(model?.pricing?.prompt)
      && isZeroPrice(model?.pricing?.completion)
      && hasUnexpiredModel(model, now);
  });

  const preferred = eligible.find((model) => model.id === preferredModel)?.id;
  const configuredFallback = eligible.find((model) => model.id === fallbackModel)?.id;
  const ranked = eligible.map((model) => model.id);
  const modelIds = [...new Set([preferred, configuredFallback, ...ranked].filter(Boolean))].slice(0, 4);
  return [...modelIds, FREE_ROUTER];
}

export function openRouterModelRequest(modelCandidates) {
  const candidates = [...new Set((Array.isArray(modelCandidates) ? modelCandidates : [])
    .filter((model) => typeof model === "string" && (model.endsWith(":free") || model === FREE_ROUTER)))];
  const [model = FREE_ROUTER, ...fallbackModels] = candidates;
  return {
    model,
    ...(fallbackModels.length ? { models: fallbackModels } : {}),
  };
}

export async function fetchOpenRouterFreeModels(apiKey, fetchImpl = fetch) {
  const url = new URL("https://openrouter.ai/api/v1/models");
  url.searchParams.set("input_modalities", "image");
  url.searchParams.set("supported_parameters", "structured_outputs");
  url.searchParams.set("sort", "intelligence-high-to-low");
  url.searchParams.set("max_price", "0");
  url.searchParams.set("limit", "1000");
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: globalThis.AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`OpenRouter model catalog returned HTTP ${response.status}.`);
  const result = await response.json();
  return Array.isArray(result?.data) ? result.data : [];
}

export async function requestOpenRouterChatCompletion({
  apiKey,
  modelCandidates,
  payload,
  fetchImpl = fetch,
}) {
  let response;
  try {
    response = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bookmoth.vercel.app",
        "X-OpenRouter-Title": "Bookmoth",
      },
      body: JSON.stringify({ ...payload, ...openRouterModelRequest(modelCandidates) }),
      signal: globalThis.AbortSignal.timeout(240000),
    });
  } catch (cause) {
    const error = new Error("Bookmoth could not reach OpenRouter. Check the connection and try again.");
    error.status = cause?.name === "TimeoutError" ? 504 : 503;
    throw error;
  }
  let result;
  try {
    result = await response.json();
  } catch {
    result = null;
  }
  if (!response.ok) {
    const error = new Error(result?.error?.message || `OpenRouter returned HTTP ${response.status}.`);
    error.status = response.status;
    error.error = result?.error;
    throw error;
  }
  return result;
}

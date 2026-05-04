import { Shell } from "./components/Shell";
import { useState, useEffect, useCallback } from "react";

/* ── WMO weather code → emoji + label ── */
function wmoToEmoji(code: number): string {
  if (code === 0) return "\u2600\uFE0F";
  if (code <= 3) return "\u26C5";
  if (code <= 48) return "\uD83C\uDF2B\uFE0F";
  if (code <= 57) return "\uD83C\uDF26\uFE0F";
  if (code <= 67) return "\uD83C\uDF27\uFE0F";
  if (code <= 77) return "\uD83C\uDF28\uFE0F";
  if (code <= 82) return "\uD83C\uDF27\uFE0F";
  if (code <= 86) return "\uD83C\uDF28\uFE0F";
  return "\u26C8\uFE0F";
}

function wmoToLabel(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  return "Thunderstorm";
}

/* ── Types ── */
interface CurrentWeather {
  temperature: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
}

interface DailyForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
}

interface GeoResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface WeatherData {
  current: CurrentWeather;
  daily: DailyForecast[];
}

/* ── API helpers ── */
async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  const data = await res.json();
  return {
    current: {
      temperature: data.current.temperature_2m,
      weatherCode: data.current.weather_code,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
    },
    daily: (data.daily.time as string[]).map((date: string, i: number) => ({
      date,
      weatherCode: data.daily.weather_code[i] as number,
      tempMax: data.daily.temperature_2m_max[i] as number,
      tempMin: data.daily.temperature_2m_min[i] as number,
    })),
  };
}

async function searchCity(query: string): Promise<GeoResult[]> {
  if (!query.trim()) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results ?? []).map((r: { name: string; country: string; latitude: number; longitude: number }) => ({
    name: r.name,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

/* ── Temperature conversion ── */
function toF(c: number): number {
  return c * 9 / 5 + 32;
}

function formatTemp(c: number, unit: "C" | "F"): string {
  const val = unit === "F" ? toF(c) : c;
  return `${Math.round(val)}°`;
}

/* ── localStorage helpers ── */
const LS_KEY = "weather_last_city";

function loadLastCity(): { name: string; lat: number; lon: number } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveLastCity(name: string, lat: number, lon: number) {
  localStorage.setItem(LS_KEY, JSON.stringify({ name, lat, lon }));
}

/* ── Day name helper ── */
function dayName(dateStr: string, index: number): string {
  if (index === 0) return "Today";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en", { weekday: "short" });
}

/* ── Component ── */
export default function App() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [cityName, setCityName] = useState("");
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWeather = useCallback(async (lat: number, lon: number, name: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchWeather(lat, lon);
      setWeather(data);
      setCityName(name);
      saveLastCity(name, lat, lon);
    } catch {
      setError("Failed to load weather data.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* Initial load: saved city or geolocation */
  useEffect(() => {
    const saved = loadLastCity();
    if (saved) {
      void loadWeather(saved.lat, saved.lon, saved.name);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void loadWeather(pos.coords.latitude, pos.coords.longitude, "Your Location");
        },
        () => {
          setLoading(false);
          setError("Location access denied. Search for a city above.");
        },
      );
    } else {
      setLoading(false);
      setError("Geolocation not supported. Search for a city above.");
    }
  }, [loadWeather]);

  /* Debounced city search */
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const id = setTimeout(() => {
      void searchCity(query).then(setResults);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  function selectCity(r: GeoResult) {
    setQuery("");
    setResults([]);
    void loadWeather(r.latitude, r.longitude, `${r.name}, ${r.country}`);
  }

  return (
    <Shell>
      <div className="max-w-2xl mx-auto">
        {/* Search */}
        <div className="relative mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city..."
            className="w-full px-4 py-3 outline-none"
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "0.75rem",
              color: "var(--ink)",
            }}
          />
          {results.length > 0 && (
            <ul
              className="absolute left-0 right-0 mt-1 overflow-hidden z-10"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "0.75rem",
              }}
            >
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    onClick={() => selectCity(r)}
                    className="w-full text-left px-4 py-3 transition-colors cursor-pointer"
                    style={{ color: "var(--ink)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--line)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {r.name}, {r.country}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Loading / Error */}
        {loading && (
          <p style={{ color: "var(--muted)" }} className="text-center py-12">
            Loading weather...
          </p>
        )}
        {error && (
          <p style={{ color: "var(--error)" }} className="text-center py-12">
            {error}
          </p>
        )}

        {/* Weather content */}
        {weather && !loading && (
          <>
            {/* Current weather card */}
            <div
              className="p-6 mb-6 text-center"
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: "1.25rem",
              }}
            >
              <p className="text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
                {cityName}
              </p>
              <div className="text-5xl mb-2">
                {wmoToEmoji(weather.current.weatherCode)}
              </div>
              <div
                className="leading-none mb-2"
                style={{
                  fontFamily: "Fraunces, serif",
                  fontSize: "5rem",
                  fontWeight: 800,
                  color: "var(--ink)",
                }}
              >
                {formatTemp(weather.current.temperature, unit)}
              </div>
              <p className="text-base mb-4" style={{ color: "var(--muted)" }}>
                {wmoToLabel(weather.current.weatherCode)}
              </p>

              {/* Stats row */}
              <div className="flex justify-center gap-8 text-sm" style={{ color: "var(--muted)" }}>
                <span>Humidity {weather.current.humidity}%</span>
                <span>Wind {Math.round(weather.current.windSpeed)} km/h</span>
              </div>
            </div>

            {/* Unit toggle */}
            <div className="flex justify-center mb-6">
              <div
                className="inline-flex overflow-hidden"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "0.75rem",
                }}
              >
                <button
                  onClick={() => setUnit("C")}
                  className="px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    background: unit === "C" ? "var(--accent)" : "var(--panel)",
                    color: unit === "C" ? "#fff" : "var(--muted)",
                  }}
                >
                  °C
                </button>
                <button
                  onClick={() => setUnit("F")}
                  className="px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    background: unit === "F" ? "var(--accent)" : "var(--panel)",
                    color: unit === "F" ? "#fff" : "var(--muted)",
                    borderLeft: "1px solid var(--line)",
                  }}
                >
                  °F
                </button>
              </div>
            </div>

            {/* 7-day forecast */}
            <div
              className="overflow-hidden"
              style={{
                border: "1px solid var(--line)",
                borderRadius: "1.25rem",
                background: "var(--panel)",
              }}
            >
              <h2
                className="px-5 pt-4 pb-2 text-sm font-semibold"
                style={{ color: "var(--muted)" }}
              >
                7-Day Forecast
              </h2>
              {weather.daily.map((day, i) => (
                <div
                  key={day.date}
                  className="flex items-center px-5 py-3"
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid var(--line)",
                  }}
                >
                  <span className="w-16 text-sm font-medium" style={{ color: "var(--ink)" }}>
                    {dayName(day.date, i)}
                  </span>
                  <span className="text-2xl mx-3">{wmoToEmoji(day.weatherCode)}</span>
                  <span className="flex-1 text-sm" style={{ color: "var(--muted)" }}>
                    {wmoToLabel(day.weatherCode)}
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                    {formatTemp(day.tempMax, unit)}
                  </span>
                  <span className="text-sm ml-2" style={{ color: "var(--muted)" }}>
                    {formatTemp(day.tempMin, unit)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}

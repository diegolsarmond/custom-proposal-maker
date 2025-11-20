const SCOPES = "https://www.googleapis.com/auth/calendar";
const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";
const CALENDAR_ID = "primary";

type CalendarEventInput = {
  scheduled_at: string;
  type: string;
  description: string;
  duration?: number | null;
  clients: {
    name: string;
    company_name: string;
  };
};

type GapiAuthInstance = {
  isSignedIn: {
    get: () => boolean;
  };
  signIn: () => Promise<void>;
};

type GapiClient = {
  init: (config: {
    apiKey: string;
    clientId: string;
    discoveryDocs: string[];
    scope: string;
  }) => Promise<void>;
  calendar: {
    events: {
      insert: (params: {
        calendarId: string;
        resource: Record<string, unknown>;
      }) => Promise<{ result: { id?: string } }>;
      patch: (params: {
        calendarId: string;
        eventId: string;
        resource: Record<string, unknown>;
      }) => Promise<{ result: { id?: string } }>;
    };
  };
};

type GapiNamespace = {
  load: (
    name: string,
    options: {
      callback: () => void;
      onerror: () => void;
      timeout?: number;
      ontimeout?: () => void;
    },
  ) => void;
  client: GapiClient;
  auth2: {
    getAuthInstance: () => GapiAuthInstance;
  };
};

declare const gapi: GapiNamespace;

let clientReady: Promise<void> | null = null;

const loadScript = () =>
  new Promise<void>((resolve, reject) => {
    if (typeof gapi !== "undefined") {
      resolve();
      return;
    }

    const existingScript = document.getElementById("gapi-script");

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("Erro ao carregar Google API")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.id = "gapi-script";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Erro ao carregar Google API"));
    document.body.appendChild(script);
  });

const initClient = async () => {
  await loadScript();

  if (!clientReady) {
    clientReady = new Promise<void>((resolve, reject) => {
      gapi.load("client:auth2", {
        callback: async () => {
          try {
            await gapi.client.init({
              apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
              clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
              discoveryDocs: [DISCOVERY_DOC],
              scope: SCOPES,
            });

            const auth = gapi.auth2.getAuthInstance();

            if (!auth.isSignedIn.get()) {
              await auth.signIn();
            }

            resolve();
          } catch (error) {
            reject(error);
          }
        },
        onerror: () => reject(new Error("Erro ao inicializar Google API")),
        timeout: 5000,
        ontimeout: () => reject(new Error("Tempo excedido ao inicializar Google API")),
      });
    });
  }

  return clientReady;
};

const buildEventResource = (event: CalendarEventInput) => {
  const startDate = new Date(event.scheduled_at);
  const durationMinutes = event.duration && event.duration > 0 ? event.duration : 60;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  return {
    summary: event.type,
    description: `${event.description}\nCliente: ${event.clients.company_name} - ${event.clients.name}`,
    start: {
      dateTime: startDate.toISOString(),
    },
    end: {
      dateTime: endDate.toISOString(),
    },
  };
};

export const createEvent = async (event: CalendarEventInput) => {
  await initClient();
  const response = await gapi.client.calendar.events.insert({
    calendarId: CALENDAR_ID,
    resource: buildEventResource(event),
  });

  return response.result.id as string | undefined;
};

export const updateEvent = async (eventId: string, event: CalendarEventInput) => {
  await initClient();
  const response = await gapi.client.calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    resource: buildEventResource(event),
  });

  return response.result.id as string | undefined;
};

export const cancelEvent = async (eventId: string) => {
  await initClient();
  await gapi.client.calendar.events.patch({
    calendarId: CALENDAR_ID,
    eventId,
    resource: { status: "cancelled" },
  });
};

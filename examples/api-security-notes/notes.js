// Notes shown on the site. PLACEHOLDER and STARTER notes are drafts based on the OWASP API Security Top 10 (2023);
// replace them with your own Notion notes.
// Fields: title, category, tags[], summary, body (plain text, blank lines = paragraphs), source (URL, optional), updated (YYYY-MM-DD)
window.NOTES = [
  {
    "title": "PLACEHOLDER — Broken Object Level Authorization",
    "category": "Authorization",
    "tags": [
      "OWASP API1",
      "BOLA"
    ],
    "summary": "Sample entry. Will be replaced with your Notion notes.",
    "body": "Check that every request for an object verifies the caller is allowed to access that specific object, not just that they are logged in.\n\nThis is placeholder text until your Notion notes are imported.",
    "source": "https://owasp.org/API-Security/",
    "updated": "2026-11-04"
  },
  {
    "title": "STARTER — API2:2023 Broken Authentication",
    "category": "Authentication",
    "tags": [
      "OWASP API2",
      "account takeover"
    ],
    "summary": "Weak or misimplemented authentication lets attackers take over user accounts and act as them.",
    "body": "Authentication endpoints, including password recovery, are exposed to everyone and are often implemented incorrectly. Attackers who exploit weak authentication can take over user accounts, read personal data, and perform sensitive actions that look legitimate.\n\nUse established standards for authentication, token generation, and password storage. Apply strict anti-brute-force controls, lockout, or CAPTCHA to login and password recovery. Require re-authentication for sensitive changes such as email or 2FA updates. Never use API keys to authenticate users.",
    "source": "https://api-security.owasp.org/editions/2023/en/0xa2-broken-authentication",
    "updated": "2026-11-04"
  },
  {
    "title": "STARTER — API3:2023 Broken Object Property Level Authorization",
    "category": "Authorization",
    "tags": [
      "OWASP API3",
      "mass assignment"
    ],
    "summary": "APIs that do not check access to individual object properties leak data or let users change fields they should not control.",
    "body": "The API does not check whether a user may read or change specific properties of an object. Returning every property, or binding client input directly to objects (mass assignment), can expose data or enable privilege escalation.\n\nReturn only the properties each response needs instead of using generic serializers. Avoid automatically binding client input to internal object properties. Allow clients to update only the properties they are meant to change. Validate responses against a schema.",
    "source": "https://api-security.owasp.org/editions/2023/en/0xa3-broken-object-property-level-authorization",
    "updated": "2026-11-04"
  },
  {
    "title": "PLACEHOLDER — Rate limiting",
    "category": "Availability",
    "tags": [
      "OWASP API4"
    ],
    "summary": "Sample entry. Will be replaced with your Notion notes.",
    "body": "Limit requests per client and per endpoint, and cap payload sizes.\n\nThis is placeholder text until your Notion notes are imported.",
    "source": "",
    "updated": "2026-11-04"
  },
  {
    "title": "STARTER — API5:2023 Broken Function Level Authorization",
    "category": "Authorization",
    "tags": [
      "OWASP API5",
      "admin endpoints"
    ],
    "summary": "Missing role checks let anonymous or regular users call privileged API functions such as admin endpoints.",
    "body": "Anonymous or regular users can send legitimate API calls to functions they should not reach, often administrative endpoints. Predictable API structure makes these flaws easy to find, leading to data disclosure, loss, corruption, or service disruption.\n\nCall one consistent authorization module from every business function. Deny all access by default and grant each function explicitly to specific roles. Have administrative controllers inherit role checks from an admin base controller. Review endpoints against business logic and group hierarchy.",
    "source": "https://api-security.owasp.org/editions/2023/en/0xa5-broken-function-level-authorization",
    "updated": "2026-11-04"
  },
  {
    "title": "STARTER — API6:2023 Unrestricted Access to Sensitive Business Flows",
    "category": "Business logic",
    "tags": [
      "OWASP API6",
      "bot abuse"
    ],
    "summary": "Business flows exposed without limits on automated use can be scripted to harm the business, such as by scalping stock or spamming.",
    "body": "Endpoints expose business flows, such as purchases, comments, or reservations, without limits on automated use. Attackers script these flows to scalp stock, spam, or hoard slots, which harms the business more than the systems.\n\nIdentify which business flows cause harm if used excessively. Use device fingerprinting to deny unexpected clients such as headless browsers. Detect automation through CAPTCHAs and non-human behavior patterns. Restrict machine-facing APIs and consider blocking Tor exit nodes and known proxies.",
    "source": "https://api-security.owasp.org/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows",
    "updated": "2026-11-04"
  },
  {
    "title": "STARTER — API7:2023 Server Side Request Forgery",
    "category": "Input & integrations",
    "tags": [
      "OWASP API7",
      "SSRF"
    ],
    "summary": "An API that fetches user-supplied URLs without validation can be turned against internal systems.",
    "body": "SSRF happens when an API fetches a remote resource from a user-supplied URL without validating it. Attackers can make the server reach internal services, scan internal networks, bypass firewalls or leak cloud credentials. Webhooks, URL previews and URL-based file imports make it common.\n\nIsolate the resource-fetching component from internal networks. Allow-list expected remote origins, URL schemes, ports and media types. Disable HTTP redirects and use a well-maintained URL parser. Never return raw upstream responses to clients.",
    "source": "https://api-security.owasp.org/editions/2023/en/0xa7-server-side-request-forgery",
    "updated": "2026-11-04"
  },
  {
    "title": "STARTER — API8:2023 Security Misconfiguration",
    "category": "Configuration",
    "tags": [
      "OWASP API8",
      "Hardening"
    ],
    "summary": "Insecure defaults, missing patches and loose settings anywhere in the API stack give attackers an easy way in.",
    "body": "Security misconfiguration can occur at any layer of the API stack. Attackers look for unpatched systems, insecure defaults, unneeded features, missing TLS, weak CORS policies and verbose errors, which can expose sensitive data or lead to full server compromise.\n\nUse a repeatable hardening process and continuously assess configuration in every environment. Enforce TLS for all API traffic, internal and external. Allow only the HTTP verbs and content types each endpoint needs. Define response schemas, including errors, so stack traces never leak.",
    "source": "https://api-security.owasp.org/editions/2023/en/0xa8-security-misconfiguration",
    "updated": "2026-11-04"
  },
  {
    "title": "STARTER — API9:2023 Improper Inventory Management",
    "category": "Inventory",
    "tags": [
      "OWASP API9",
      "API inventory"
    ],
    "summary": "Undocumented, forgotten or outdated API versions and data flows become unprotected attack paths.",
    "body": "Improper inventory management means not knowing which API hosts, versions, endpoints and third-party data flows you run. Forgotten or deprecated versions often lack current protections, and attackers use them to reach data or admin functions, sometimes backed by the production database.\n\nCatalog every API host with its environment, audience and version. Generate documentation automatically in CI/CD and restrict it to authorized users. Apply external API protections to every exposed version, not just production. Retire or patch old versions, and keep production data out of non-production.",
    "source": "https://api-security.owasp.org/editions/2023/en/0xa9-improper-inventory-management",
    "updated": "2026-11-04"
  },
  {
    "title": "STARTER — API10:2023 Unsafe Consumption of APIs",
    "category": "Input & integrations",
    "tags": [
      "OWASP API10",
      "Third-party APIs"
    ],
    "summary": "Trusting data from third-party APIs more than user input lets a compromised integration attack your API.",
    "body": "Unsafe consumption of APIs happens when developers trust data from third-party or integrated APIs more than user input, applying weaker validation, transport and authentication. An attacker who compromises or poisons an integrated service can trigger injection, data exposure or denial of service.\n\nAssess a provider's API security posture before integrating. Use TLS for all API interactions. Validate and sanitize all data from integrated APIs before using it. Allow-list redirect targets instead of following redirects blindly.",
    "source": "https://api-security.owasp.org/editions/2023/en/0xaa-unsafe-consumption-of-apis",
    "updated": "2026-11-04"
  }
];

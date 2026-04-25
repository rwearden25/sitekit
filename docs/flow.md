# SiteKit Architecture Flow Charts

Mermaid diagrams below render automatically on GitHub. Open this file there
(or any Markdown viewer with Mermaid support) for the visual.

## 1. How a request gets routed (the big picture)

```mermaid
flowchart TD
    Visitor([Visitor's browser])

    subgraph DNS["DNS — yourdomain.com"]
        Wildcard["CNAME *.yourdomain.com<br/>→ sitekit.up.railway.app"]
    end

    subgraph Railway["Railway — single Next.js service"]
        MW[middleware.ts<br/>resolves hostname]
        Marketing["app/page.tsx<br/>marketing root"]
        Portal["app/portal/*<br/>customer editor"]
        Site["app/site/[slug]/*<br/>public one-pager"]
    end

    subgraph SB["Supabase"]
        Auth[Auth — magic links<br/>cookies, sessions]
        DB[(Postgres + RLS<br/>tenants, content, media)]
        Storage[Storage — site-media bucket<br/>tenant-scoped folders]
    end

    Visitor -->|"yourdomain.com"| DNS
    Visitor -->|"portal.yourdomain.com"| DNS
    Visitor -->|"acme.yourdomain.com"| DNS
    Visitor -->|"acmecleaning.com (custom)"| DNS

    DNS --> MW

    MW -->|"root host"| Marketing
    MW -->|"portal subdomain"| Portal
    MW -->|"any other subdomain<br/>or custom domain"| Site

    Portal -->|"signed-in customer<br/>via cookie"| DB
    Portal -->|"sign in / out"| Auth
    Portal -->|"upload images"| Storage
    Site -->|"service-role read<br/>by host or slug"| DB
    Site -->|"<img src=...>"| Storage
```

## 2. What hostname maps to what content

```mermaid
flowchart LR
    A["yourdomain.com"] -->|kind: marketing| AA["app/page.tsx<br/>your landing page"]
    B["portal.yourdomain.com"] -->|kind: portal| BB["app/portal/*<br/>customer editor"]
    C["acme.yourdomain.com"] -->|kind: site, slug=acme| CC["site_content WHERE<br/>slug=acme"]
    D["acmecleaning.com"] -->|kind: site, slug=full host| DD["site_content WHERE<br/>custom_domain=<br/>acmecleaning.com"]
    E["sitekit.up.railway.app/site/acme"] -->|path-based fallback| CC
```

## 3. Onboarding a new customer (your workflow)

```mermaid
sequenceDiagram
    participant You
    participant CLI as provision-tenant.ts
    participant Supa as Supabase
    participant Cust as Customer's inbox

    You->>CLI: npm run provision -- acme "Acme" owner@acme.com
    CLI->>Supa: insert into tenants (slug, name)
    Supa-->>CLI: tenant_id
    CLI->>Supa: insert into site_content (seed defaults)
    CLI->>Supa: auth.admin.inviteUserByEmail(owner@acme.com)
    Supa->>Cust: magic-link email
    CLI->>Supa: insert into tenant_members (owner)
    CLI-->>You: "Done. acme.yourdomain.com is live."

    Cust->>Supa: clicks email link
    Supa->>Cust: redirects to /portal/auth/callback
    Cust->>Cust: session cookie set, lands in editor
```

## 4. Customer self-serve (zero involvement from you)

```mermaid
sequenceDiagram
    participant Cust as Customer
    participant Portal as Portal (app/portal)
    participant Action as saveSiteContent (server action)
    participant DB as Supabase Postgres
    participant Public as Public site

    Cust->>Portal: edits headline, hours, services
    Cust->>Action: clicks "Save"
    Action->>DB: upsert site_content (RLS scoped)
    Action->>DB: insert audit_log entry
    Action->>Action: revalidatePath('/site/acme')
    Action-->>Cust: "Saved. Your site has been updated."

    Note over Cust,Public: Visitor hits the public site
    Cust->>Public: opens acme.yourdomain.com
    Public->>DB: load tenant + content via service role
    Public-->>Cust: SSR'd one-page site (cached 30s)
```

## 5. Tenant isolation (RLS keeps customers separate)

```mermaid
flowchart TB
    subgraph A["Acme's portal session"]
        AU[Customer A logged in]
    end
    subgraph B["BetaCo's portal session"]
        BU[Customer B logged in]
    end

    AU -->|select * from site_content| RLS{is_tenant_member?}
    BU -->|select * from site_content| RLS

    RLS -->|"A is member of acme tenant"| AcmeOnly[(only acme rows)]
    RLS -->|"B is member of beta tenant"| BetaOnly[(only beta rows)]

    AcmeOnly -.->|cannot see| BetaOnly
    BetaOnly -.->|cannot see| AcmeOnly

    style RLS fill:#fee,stroke:#c00,stroke-width:2px
```

## 6. Where storage lives

```mermaid
flowchart TD
    Bucket[("site-media<br/>(public bucket)")]
    Bucket --> A["acme-tenant-uuid/<br/>logo.png<br/>hero.jpg"]
    Bucket --> B["beta-tenant-uuid/<br/>storefront.png"]
    Bucket --> C["other-tenant-uuid/<br/>..."]

    Cust1[Acme customer<br/>uploads logo]
    Cust2[BetaCo customer<br/>tries to write to acme/]

    Cust1 -.->|"first folder = own tenant<br/>✓ allowed by storage RLS"| A
    Cust2 -.->|"first folder ≠ own tenant<br/>✗ DENIED"| A

    style A fill:#e6ffe6
    style B fill:#e6ffe6
```

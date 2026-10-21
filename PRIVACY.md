# Privacy policy

**GoLink** is a self-hosted link shortener. The person who runs the instance
is the one who operates it, and this document is the one they publish.

> **This is a template.** Every section marked with a `‹...›` is a decision
> the operator makes, not a fact GoLink can decide for them. GoLink knows
> which processors *can* be in use, because it reads them from the
> environment. The operator says which ones *are* in use, and publishes the
> result. Publish a filled-in copy at the URL your users are told about,
> and delete these instructions.

---

## Who runs this instance

- ‹Name of the operator — a person or an organisation›
- ‹Contact address for privacy questions›
- ‹The address the instance is served from›

GoLink itself is open source software. It is published under a licence that
includes the source. The operator is the one who decides what to do with the
data, so the operator is the one who answers questions about it.

## What the software does with personal data

The features that store something about a person, and what is stored:

| what | what is kept | why |
| --- | --- | --- |
| an account | name, email address, a hashed password | so the person can sign in again |
| a session | a token, the address it was created from, when it expires | so a sign-in lasts |
| a workspace | its name, its slug, its time zone | so the links in it have an owner |
| membership | who is in the workspace and what role they hold | so the right people can do the right things |
| a short link | the destination, the back half, the title, the tags, who created it and when | that is what a link shortener is for |
| a click | the time, the referring page, the country, the city, the device, the browser, and the first three octets of the address | so the owner of a link can see who is clicking it |
| a QR code | the same as a link, plus the design | so a printed code can be traced back |
| a page | the blocks, the views, the clicks on each block | so the owner can see what a page does |
| an activity log | what was changed, by whom, when | so an owner can see what happened in their workspace |
| a bulk upload | the file name, the rows, and the errors | so the owner can see which rows failed |

**The full address of a visitor is never stored.** A `/24` prefix for IPv4
or a `/48` prefix for IPv6 is stored instead. A count is not personal, so
the counts survive; the address does not, so it is thrown away.

**The password is never stored.** It is hashed with scrypt, and the hash is
what sits in the database.

**An API token is never stored in the clear.** The token is hashed with
SHA-256 before it is written, and the plain token is shown once, at the
moment it is created. A copy of the database does not hand out working
tokens.

## How long things are kept

| what | how long |
| --- | --- |
| accounts and their links | until the account is deleted, or the workspace is deleted |
| sessions | 30 days, then they are pruned |
| click events | 90 days, then the personal fields are stripped and the counts kept |
| the activity log | 90 days |
| a deleted account | a record of the address is kept for ‹the period your jurisdiction requires› so it cannot be re-registered immediately |

## The processors

These are the only parties that can see data, and only the ones the operator
has switched on. ‹Delete the ones that are not in use, and say which are.›

| processor | what it sees | why | where it is |
| --- | --- | --- | --- |
| the host | everything, because it stores the database and runs the application | the instance has to run somewhere | ‹the host and the region› |
| ‹your mail provider, e.g. Resend or Postmark› | the recipient address and the content of the message | to deliver a verification or a password reset | ‹the provider and the region› |
| ‹your model provider, e.g. an OpenAI-compatible API or Ollama› | the text sent to the assistant, and the answer | to write a title or a description | ‹the provider and the region› |
| ‹Google› | the address and the name, when the person signs in with Google | to identify the person | Google |
| ‹your analytics› | ‹what› | ‹why› | ‹where› |

‹If the assistant is served by Ollama on the same machine, there is no
third party at all: say so here, and do not list a model provider.›

## What leaves the machine

- **Clicks.** A click is written to the database on the same machine. It is
  not sent anywhere else, unless a webhook is configured.
- **Webhooks.** If a webhook is configured, the event is sent to the URL
  that was given. The payload is signed so the receiver can tell it came
  from here. The receiver sees the same fields the click has.
- **The assistant.** If the assistant is switched on, the text sent to it
  and the answer come back are written to the database.
- **The redirect itself.** A browser that follows a short link goes
  straight to the destination. The destination sees the browser, not
  GoLink, except for the `Referer` header the browser sends.

## Your rights

Depending on where you are, this can include:

- **Access** — a copy of what is held about you.
- **Correction** — fixing what is wrong.
- **Deletion** — deleting your account. The sign-out button and the
  settings screen both do this, and the workspace and its links survive, so
  deleting one person's account does not break everybody's links.
- **Portability** — the links are yours, and the API will hand them to you
  in bulk.
- **Objection and restriction** — where the law gives you those.

Write to ‹the contact address above›. ‹State the period you will take to
answer: for example, thirty days.›

## Security

- Row level security in the database, so a query that forgets to scope
  itself returns nothing rather than everything.
- The authorisation decision is made in one place.
- Secrets are read from the environment and are never written to the
  client bundle.
- Outbound webhooks are signed with HMAC-SHA256 over a timestamp and the
  body, so a replay is detectable.
- The dependency tree is audited.

## Children

GoLink is not aimed at children, and an instance operator should not
collect information from them. ‹If your instance is used by schools or
similar, write the rule you follow here.›

## Changes

‹State how you will tell people when this changes: for example, the date
of the last change, and where the new version is published.›

---

## The check the operator should run before publishing

GoLink reads its own configuration. Before publishing this document, look
at the environment and confirm that every processor listed above is one
that is actually switched on, and that nothing that is switched on is
missing from the list:

| variable | processor it turns on |
| --- | --- |
| `SMTP_HOST` | the mail provider |
| `AI_BASE_URL` | the model provider |
| `GOOGLE_CLIENT_ID` | Google |

If a variable is not set, that processor is not in use, and its row should
be deleted rather than left with a blank in it.

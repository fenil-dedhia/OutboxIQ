---
title: Privacy Policy
permalink: /legal/privacy
---

<!--
  Date convention: when editing this document, update only the
  "Last updated:" date to the date of the change. The "Effective date:"
  stays at May 27, 2026 unless a future change is significant enough to
  constitute a new effective version (an owner judgment call).
-->

**Last updated:** May 27, 2026
**Effective date:** May 27, 2026

## Summary

Fashionably Late is a Chrome extension that enhances Gmail's native Schedule Send feature. **The Free version of Fashionably Late does not collect, transmit, or store any of your data on any server.** Everything the extension does happens inside your browser, on your own device. There is no account, no login, no backend, no analytics, no tracking, no third parties.

This document explains exactly what data the extension handles, where it lives, and your rights regarding it. If anything below is unclear, contact us at the address in Section 9.

---

## 1. Who we are

The data controller for the purposes of this policy is:

**Fenil Dedhia**
State of New Jersey, United States
Contact: fenil.h.dedhia@gmail.com

Fenil Dedhia operates Fashionably Late as a solo founder. References to "we," "us," and "our" in this document mean Fenil Dedhia in that capacity.

---

## 2. Scope of this policy

This policy covers the **Free version** of the Fashionably Late Chrome extension (referred to here as "Fashionably Late" or "the extension").

A paid Premium version of Fashionably Late may be offered in the future. If it is, it will be released as a **separate Chrome Web Store extension** — a distinct listing, with a distinct installation, distinct permissions, and its own privacy policy. There is no in-product upgrade from the Free extension to a Premium extension; users who want Premium would install it separately, and its data handling would be disclosed in its own policy before any user could sign up. **The Free version's data handling described in this policy will not change as a result of Premium being launched.**

---

## 3. What data the extension handles

Fashionably Late handles the following categories of data, all of which are stored **only in your browser** using the standard Chrome extension storage mechanism (`chrome.storage.local`):

- **Your timezone**, which you set during onboarding and can change in Settings at any time.
- **Your working hours and "default boundaries"**, which you configure to control when the extension suggests scheduling sends.
- **Your pinned timezones**, a list of up to five timezones you choose for quick access in the picker.
- **Your feature preferences**, such as whether the recipient-optimized scheduling suggestion is enabled.
- **A local cache of recipient timezones** you have manually picked when scheduling emails. Each entry consists of an email address, the timezone you picked for that recipient, and the date you picked it. This cache exists only on your device, is never transmitted, and exists to save you from re-picking the same person's timezone repeatedly.
- **A record that you have completed onboarding**, so the extension knows not to show the onboarding flow again.

That is the complete list. There is no other data the extension stores, transmits, or accesses.

---

## 4. What the extension does NOT do

For clarity, and because much of this policy is about what we don't do, we state the following explicitly:

- **The extension does not transmit any of the above data anywhere.** It does not send data to us, to any server we operate, or to any third party. There is no network endpoint the extension calls.
- **The extension does not read or transmit the content of your emails.** It reads the timestamp and recipient list of an email you are composing in order to schedule it, and it reads recipient chips in the Gmail compose window to suggest scheduling. It does not read message bodies, subjects, or any other email content.
- **The extension does not use cookies, web beacons, fingerprinting, or any other tracking technology.**
- **The extension does not include analytics, telemetry, crash reporting, or any form of usage measurement.**
- **The extension does not access your Gmail account through Google's API.** It uses no OAuth, requests no Google account permissions, and does not authenticate with Google in any way. It interacts with Gmail only by extending the Gmail web interface visually, in the same way browser extensions like ad blockers or grammar checkers do.
- **The extension does not share data with third parties.** There are no third parties, because there is no data leaving your device.
- **The extension does not sell data.** Same reason.

---

## 5. Where your data lives

All data the extension handles is stored in **`chrome.storage.local` on your device.** This is a standard Chrome browser storage mechanism that is isolated to the Fashionably Late extension and accessible only to the extension running in your browser.

The data is not synced to your Google account, not transmitted to any server, and not visible to other extensions or websites. It exists in the same place on your device as your browser cache and similar local data, and is removed by uninstalling the extension or by using the in-extension "Delete My Data" feature (see Section 7).

---

## 6. Legal basis for processing (for users in the EU/EEA/UK)

For users in the European Union, European Economic Area, or United Kingdom, our legal basis for processing the data described in Section 3 is your **consent**, given by installing the extension and using its features. You may withdraw this consent at any time by uninstalling the extension or using the in-extension "Delete My Data" feature, which removes the data entirely.

Because the data never leaves your device and is never accessible to us, we are not in a practical sense "processing" your data in the way the GDPR primarily contemplates. We disclose the categories above out of an abundance of transparency.

---

## 7. Your rights

You have the following rights regarding your data. Because the data lives only on your device and is fully under your control, exercising most of these rights does not require contacting us — you can do so directly through the extension's Settings panel.

- **Right of access.** You can see all data the extension stores about you by opening the extension's Settings panel and using the "Export My Data" feature. This produces a JSON file containing the complete set of data the extension has stored on your device.
- **Right of erasure ("right to be forgotten").** You can delete all data the extension has stored on your device by opening the extension's Settings panel and using the "Delete My Data" feature. This action is irreversible and requires a confirmation. Uninstalling the extension also removes its data.
- **Right of rectification.** You can edit any of the data the extension stores (your timezone, working hours, pinned timezones, cached recipient timezones, preferences) directly in the Settings panel at any time.
- **Right to data portability.** The "Export My Data" feature produces machine-readable JSON suitable for porting to another tool.
- **Right to object / right to restrict processing.** Because the extension processes data only locally and at your direction, you can object to or restrict any processing by changing your preferences in Settings, disabling the relevant feature, or uninstalling.
- **Right not to be subject to automated decision-making.** The extension makes scheduling **suggestions** based on your settings and the recipient timezone you have chosen. It never sends or cancels an email without your explicit confirmation. No automated decision with legal or similarly significant effect is made.

For users in California, you additionally have the rights described in the California Consumer Privacy Act and California Privacy Rights Act, including the right to know what categories of personal information are collected (see Section 3), the right to delete (see "Right of erasure" above), the right to correct (see "Right of rectification" above), and the right to opt out of sale or sharing of personal information. **We do not sell or share personal information.** There is no data leaving your device for us to sell.

To exercise any right that cannot be exercised directly through the extension, or to ask a question about your rights, contact us at the address in Section 9.

---

## 8. Data retention

Data stored by the extension is retained for as long as the extension is installed and you have not deleted the data. Specifically:

- **Settings, preferences, working hours, timezone, and pinned timezones** are retained until you change them or delete your data.
- **Cached recipient timezones** are retained indefinitely until you delete the individual entry, clear the cache from Settings, or delete all data. This is intentional: the cache exists to save you from re-picking the same recipient's timezone over time.
- **Onboarding completion status** is retained until you delete your data, at which point the extension treats you as a new user and will show onboarding again on next use.

Uninstalling the extension removes all the above data.

---

## 9. Contact

For questions about this policy or about your data, contact:

**Fenil Dedhia**
Email: fenil.h.dedhia@gmail.com

We aim to respond to privacy-related inquiries within a reasonable time. Because Fashionably Late is operated by a solo founder, response times may vary, but we take privacy requests seriously and will respond.

For users in the EU/EEA/UK, you also have the right to lodge a complaint with your local data protection supervisory authority if you believe your rights have been violated.

---

## 10. Children's privacy

Fashionably Late is not directed at children under 13 (or under 16 in the EU/EEA/UK). We do not knowingly collect data from children, but as the extension does not collect or transmit data to us in the first place, there is no practical mechanism by which a child's data could reach us.

---

## 11. Changes to this policy

If this policy changes materially, the change will be reflected in the version of the policy published at `https://fashionablylate.app/legal/privacy` (or its successor URL, with redirects from the prior URL maintained). The "Last updated" date at the top of this document will be revised. Material changes that affect how user data is handled will be accompanied by a notice in the extension itself (e.g., a one-time prompt on next use) before the new policy takes effect.

A future Premium version of Fashionably Late, if released, will be a **separate Chrome Web Store extension** with its own installation and its own privacy policy (see Section 2). Users will opt in to Premium's data handling by choosing to install that separate extension; **the Free version's privacy terms described in this policy are not affected by Premium's launch.**

---

## 12. Governing law

This policy and any disputes arising from it are governed by the laws of the State of New Jersey, United States, without regard to its conflict-of-laws provisions. For users in the EU/EEA/UK, this governing-law clause does not override mandatory local consumer or data protection law that would apply regardless.

---

*This policy is published at https://fashionablylate.app/legal/privacy. The source markdown is maintained in the public Fashionably Late repository on GitHub; the policy's revision history is auditable there.*

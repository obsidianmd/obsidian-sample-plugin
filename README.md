# Processor Processor for Obsidian

![version](https://img.shields.io/badge/version-1.0.0-blue)
![license](https://img.shields.io/badge/license-MIT-green)

For anyone involved in vendor risk management, mapping out subprocessor relationships can be a complex and time-consuming task. This plugin is a powerful, specialized tool designed to automate and streamline that process.

Processor Processor acts as your AI-powered co-pilot to discover, map, enrich, and document the relationships between data processors and their subprocessors, all directly within your Obsidian vault. This is the first release, and your feedback is greatly appreciated!

---

### 🚀 Getting Started: One-Time Setup

This plugin is deeply integrated with [RightBrain.ai](https://rightbrain.ai) to provide its intelligent features. You only need to perform this setup once.

**1. Create a RightBrain Account**

* Go to [https://app.rightbrain.ai/](https://app.rightbrain.ai/) to register.
* You can create an account using social sign-on with GitHub, GitLab, Google, or LinkedIn.
* Follow the initial setup steps to create your account and first project.

**2. Create your RightBrain API Client**

* Navigate to your RightBrain API Clients page: [https://stag.leftbrain.me/preferences?tab=api-clients](https://stag.leftbrain.me/preferences?tab=api-clients).
* Click **Create OAuth Client**.
* Give it a descriptive name (e.g., "Obsidian Plugin").
* For "Token Endpoint Auth Method," select **Client Secret Basic (client_credentials)**.
* Click **Create**.

**3. Securely Store Your Client Secret**

* You will now be shown your `Client ID` and a `Client Secret`.
* **IMPORTANT:** The `Client Secret` is like a password for your application. It will only be shown to you **once**.
* Immediately copy the `Client Secret` and store it securely in a password manager.

**4. Copy Your Environment Variables**

* On the same page, you will see a block of text with your environment variables (`RB_ORG_ID`, etc.).
* Click the **Copy ENV** button to copy this entire block to your clipboard.

**5. Run the Setup in Obsidian**

* Make sure the Processor Processor plugin is installed and enabled in Obsidian.
* Open the Obsidian Command Palette (`Cmd/Ctrl + P`).
* Run the command: **`Complete First-Time Setup (Credentials & Tasks)`**.
* A window will pop up. Paste the environment variables you just copied into the text area.
* Click **Begin Setup**.

That's it! The plugin will automatically save your credentials and create all the necessary AI tasks in your RightBrain project.

---

### 🔒 A Note on Security

Your RightBrain credentials (Client ID, Client Secret) and other settings are stored in the `data.json` file located within this plugin's folder in your vault's system directory (`.obsidian/plugins/processor-processor/`).

Please be aware that your `Client Secret` is stored in plaintext in this file. This is standard practice for most Obsidian plugins that require API keys. We recommend you use a dedicated vault for this type of research and ensure your vault's location is secure.

---

### ✨ Core Features

* **One-Command Setup:** Get started in minutes. Paste your credentials from RightBrain and the plugin automatically configures itself and creates the required AI tasks in your project.
* **Smart Recursive Mapping:** Start with a single company and automatically cascade searches through their subprocessors, building a deep dependency map. The search is "smart"—it uses a cache to avoid re-analyzing recent vendors and maps aliases to existing notes to prevent duplicates.
* **Handle Difficult Sources:** Some subprocessor lists are buried in PDFs, hard-to-parse web pages, or not publicly available at all. The **`Manually Add Subprocessor List URL`** and **`Input Subprocessor List from Text`** features allow you to point the AI directly at a URL or simply paste the text to ensure nothing is missed.
* **AI-Powered Verification & Extraction:** Uses RightBrain to verify if a URL is a genuine, current subprocessor list and then extracts the names of all third-party vendors and internal company affiliates.
* **Automated Note Creation & Linking:** Creates a central, linked note for each processor and subprocessor. A processor's note lists its subprocessors; a subprocessor's note lists who it's "Used By."
* **AI-Powered Deduplication:** Run a command on your processors folder to find and merge duplicate entities, combining their relationships automatically.
* **Compliance Document Enrichment:** Right-click any processor file to automatically find and link to that company's public DPA, Terms of Service, and Security pages.

---

### How to Use: A Sample Workflow

1.  **Start a Recursive Discovery:**
    * Open the command palette (`Cmd/Ctrl+P`) and run **`Search for Subprocessors (Recursive Discover)`**.
    * Enter a top-level vendor you use, like "Microsoft".
    * The plugin will begin discovering Microsoft's subprocessors, and then the subprocessors of those subprocessors, creating a network of notes in your `Processors` folder.

2.  **Manually Add from a PDF:**
    * During your research, you find that one of Microsoft's subprocessors, "Contoso Ltd," only lists their own subprocessors in a PDF.
    * Open the PDF, copy the list of companies, and run the command **`Input Subprocessor List from Text`**.
    * Enter "Contoso Ltd" as the processor name, paste the text, and the plugin will extract the entities and link them correctly.

3.  **Clean Up with Deduplication:**
    * After all the discovery, you might have notes for both "AWS" and "Amazon Web Services."
    * Right-click on your `Processors` folder and select **`Deduplicate Subprocessor Pages`** to automatically find and merge them.

4.  **Enrich Key Vendor Files:**
    * Now that you have a clean list, right-click the `Microsoft.md` file in your vault.
    * Select **`Enrich Processor Documentation`**. The plugin will find and add direct links for Microsoft's DPA, ToS, and Security pages right into the note for easy access.

---

### 🌱 Future Development & Feedback

This is the first release of Processor Processor. The "Enrich" features are just the beginning of a larger plan to build a suite of automated due diligence tools.

Your feedback is invaluable for guiding what comes next! If you have ideas for new features or improvements, please share them by raising an issue on the plugin's GitHub repository.

---

### ⚠️ Limitations & Caveats

* **Reliance on Public Data:** The plugin can only find and process subprocessor lists that are publicly accessible. If a company does not publish this information, the plugin cannot invent it.
* **Scope of Subprocessor Lists:** Vendor subprocessor lists are typically comprehensive and cover all of their services. For example, Google's list includes subprocessors for all its products (Workspace, Cloud, etc.). If you only use Google Workspace, the plugin will still identify and map all subprocessors from the master list, many of which may not be relevant to your (or your processor's) specific use case. The plugin accurately reflects the source documentation and does not attempt to guess which subprocessors apply to you, as this would be unreliable.
* **Quality of Source Data:** The accuracy of the extracted relationships depends on the clarity and format of the source documents. Ambiguous or poorly formatted lists may lead to less accurate results.
* **This is not Legal Advice:** The plugin is a tool to accelerate research. It is not a substitute for professional legal or compliance advice. Always verify critical information.

---

### Author

Tisats
[rightbrain.ai](https://rightbrain.ai)

### Funding

This plugin is provided to encourage the use and exploration of [RightBrain.ai](https://rightbrain.ai). If you find it useful, please consider exploring RightBrain for your other automation needs.
# Obsidian Intelligence

> **Note**
> Educate yourself with the related prices when using large language models like GPT-4 at https://openai.com/pricing. This model uses the Assistants API, which includes the following costs:
> Code interpreter - $0.03 / session (free until 12/13/2023)
> Retrieval - $0.20 / GB / assistant / day (free until 01/12/2024)
> gpt-4-1106-preview - $0.01 / 1K tokens (input), $0.03 / 1K tokens (output)

For feedback and questions, feel free to join my [discord](https://discord.com/invite/aQgbyj522e) and check my notes on the plugin.

For bugs, please create a Github issue.

For the links on this page to work, view the documentation on my [published vault](https://publish.obsidian.md/johnmavrick/My+Areas/%E2%9B%B0%EF%B8%8F+Obsidian+Intelligence) instead.
## Features
This plugin integrates the [OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview) with Obsidian.

Right now the functionality is in beta so it is not as capable as I would like, but as OpenAI improves assistant capabilities, its tools can be used for more nuanced workflows and the assistant will need less hand-holding.
### Assistants
Create and personalize your GPT assistants within Obsidian:
- Provide custom instructions to follow, reuse the same assistant across different conversations
- Upload specific files from your notes to the assistant
- Code interpreter - enables the assistant to write and run code. This tool can process files with diverse data and formatting, and generate files such as graphs
- Retrieval - enables the assistant with knowledge from files that you or your users upload. Once a file is uploaded, the assistant automatically decides when to retrieve content based on user requests.
### Threads
Start conversations with assistants within Obsidian:
- Use different assistants within one conversation
- Clickable footnotes to show the source of an assistant's responses
### Create an assistant from notes
Run the command `Obsidian Intelligence: Create Assistant from Active Note` to automatically include the current file as well as related notes via outgoing links and backlinks into the assistant's files (due to OpenAI limitations you can only have up to 20).
### Future Features
#### Templates
- Leverage the Smart Connections embeddings storage to suggest related notes or include them in the search
- Allow for custom micro-commands
## Installation
### Via BRAT
Follow [TfTHacker's Guide](https://tfthacker.com/Obsidian+Plugins+by+TfTHacker/BRAT+-+Beta+Reviewer's+Auto-update+Tool/Quick+guide+for+using+BRAT) with the link of this github repository, https://github.com/ransurf/obsidian-intelligence
## Use Case Examples
### Dataview Assistant
If you're reading this on my vault, go to [[Create a Dataview Assistant with AI]]

If you're on the Github readme, visit https://publish.obsidian.md/johnmavrick/Create+a+Dataview+Assistant+with+AI
### More Precise Embedding
- [[GPT Retrieval]] can help you summarize book notes
### Content Creation
With the following notes:
- [[My personal brand tone]], a note describing the tone and intended audience of your writing
- [[PARA Method]], a concept note about the PARA method
- [[Blog post outline]], the desired structure for your blog post

```
Based on [[My personal brand tone]], use the content in [[PARA Method]] to create a blog post following my [[Blog post outline]] structure.
```

#### Result
```
Based on the information from the notes on the PARA method and the brand tone guidelines, here's a draft for the blog post in the required structure:

---

# Level Up Your Life Game with the PARA Method

Hey gamers, have you ever felt like your quest log's overflowing with unsorted tasks? Do you struggle to keep your inventory organized—I mean, your life's work and passions in order? Well, it's time to hit the upgrade button with the PARA method.

## Embark on Quests with Purpose

Projects are the main quests in the PARA framework—think of them as those high-stakes missions with sweet rewards at the end. But here, the loot is accomplishing your real-life goals. Each project is a series of tasks aimed at a specific target, with a deadline to keep you on your toes.

## Master the Lifelong Arenas

Now let's talk about your character's core stats. In PARA, 'Areas' are those long-term, essential attributes you need to maintain and improve, like Strength or Intelligence. They cover all the roles you play, from being a strategizing team leader to a supportive guildmate at home.

## Gather Epic Resources

Ever had that one item in your bag you knew would come in handy someday? That's what 'Resources' are in your life's inventory. These are collections of notes, links, and thoughts on topics you care about. Stash away knowledge in your personal 'Zettelkasten,' and watch as these resources empower you in quests you haven't even encountered yet.

## Archive: Your Quest Journal's Memory

Last but not least, 'Archived' is your backlog—where quests go once they're completed. It's where you store all the past victories (and learning moments) to look back on. Clearing out your current tasks to archive keeps your quest list fresh and manageable.

## Conclusion: Your Path to Victory

Like every seasoned gamer, you know the importance of having a clear game plan. PARA is like your ultimate strategy guide, helping to sort out the chaos. So embrace growth, learning, and the joy of discovery as you organize your epic life journey. Ready to level up?

---

I kept the post under 500 words to meet the criteria and included game-related metaphors, a hopeful and positive tone, as well as markdown formatting and bullet lists【12†source】【14†source】【23†source】. If you would like any adjustments or further details added, feel free to let me know!
```
### Project Management
### Learning from your notes
Using [[#Create an assistant from notes]] feature, you can turn the contents into more specific embeddings thanks to the [[GPT Retrieval]] functionality

## Disclaimers
### Access limitations
Payment is required for full access, as you will need to use your own API key.

Additional payment for features and account sign-up might be needed in the future as well to store information on the cloud, but is not implemented yet.
### Network services
To allow for AI-related features, the plugin uses the OpenAI API to create/modify/delete assistants, threads, and messages.
### Promotion
Might reference to my own tutorials and resources on how to use the plugin + self-promotion for my personal brand.
### AI-Related Disclaimers
**Which LLM are you using? Does it run locally or online?**
As of the plugin's release, the GPT assistant capabilities is only accessible with OpenAI's gpt-4-1106-preview model.

**What context are you sending to the LLM? The entire vault, several notes, the current note, fragments of the note? How does one know?**
Right now it sends the contents of the notes you pass in, the configuration of the assistants/threads you create (titles, instructions), and the messages you send to it.

In the future embeddings might be used to find related notes, which will require you to send all your notes to OpenAI to generate the embeddings.

**Do you proactively delete the input/output data? If so how long do you keep it?**
Storage follows OpenAI policies. In the future


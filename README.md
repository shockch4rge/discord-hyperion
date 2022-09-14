<div style="background:#001225; margin-bottom:40px; padding:30px; display:flex; place-content:center; height:90px; border-radius:12px">
    <img src="./assets/hyperion-hero.svg" draggable="false" alt="Hyperion Hero"/>
</div>

# Installation

uhhh its not published yet but we'll get to that soon

# What is Hyperion?

Hyperion is a framework built on top of Discord.js v14 that aims to help developers create bots efficiently.

# Why Hyperion?

Hyperion offers a myriad of features:

-   [x] **TypeScript** (yay!)

    Hyperion is written in strong and strict TypeScript, so you can be sure that your code is type-safe and that you won't be making any silly mistakes.

-   [x] **Handy interaction handling**

    The initial setup for interactions is tiring. Setting up each directory for reading/parsing, deploying your slash/context menu commands - Hyperion handles all that automagically! Or you can choose to opt out and supply your own configuration.

-   [ ] **Database support**

-   [ ] **Extensive logging**

    Hyperion uses the powerful logger, winston, to log just about almost anything you want. You can configure it to your liking, or use the default configuration.

-   [ ] **Useful utilities**

    Hyperion provides a set of utilities out of the box. Use the handy `Time.hours()` to converted hours to milliseconds. Save some time by utilising shorthand notations for building components like embeds and select menus. Did I mention Hyperion comes with a support for paginated embeds?

# Why was Hyperion made?

The slow and repetitive nature of copy-pasting code between my Discord bots was getting old _quick_. Hence, I decided to create a framework that would provide a common set of utilities and features that I could use across all my bots, while at the same time being as flexible as possible.

Hyperion's design choices and development reflects my personal experience developing Discord bots and my way of fixing/improving them.

# Is Hyperion production-ready?

Maybe. This was written as a solo project with a large amount of testing, but bugs could still slip through every now and then. I don't think it's ready for bots that have a large amount of users across hundreds of guilds, but it should be fine for smaller ones. Plus, **sharding is not supported,** as I haven't done a ton of research on it.

# FAQs (?)

## Why didn't you just use an existing framework, like Sapphire or Akairo?

cuz coding is cool

## Why "Hyperion"?

'Hyperion' is the name of a sword in the Skyblock gamemode on the Hypixel Minecraft server. It's one of the most powerful swords in there, and I thought this framework would be fitting for that title. Also, it's a very cool name.

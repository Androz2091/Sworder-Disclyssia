# Disclyssia

A personal JavaScript Discord library made by Sworder71

## Installation

Disclyssia was made with [Node.js](https://nodejs.org/) v12.16.2, you should preferably use this version

GitHub: `npm i --save Androz2091/Disclyssia`

## Information

This module has currently:

- Client support (**sendMessage()** and **setPresence()** methods are made)
- No voice support
- No message support
- No channel support
- No server support
- No user support

## Example usage

```js
const Discord = require('disclyssia');
const client = new Discord.Client();

client.on('ready', async (client) => {
    const self = await client.getSelf();
    console.log(`${self.username}#${self.discriminator} is online !`);
    await client.setPresence({ game: {name: 'Hello, World!' } });
});

client.on('message', (message) => {
    if (message.content.startsWith('!ping')) {
        client.sendMessage(message.channel_id, {
            content: 'Pong!'
        }).catch();
    }
});

client.login(''); // put your bot token here
```

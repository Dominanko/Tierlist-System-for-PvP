# Discord Tierlist Queue Bot

A Discord bot built with **discord.js** that manages **tierlist testing queues**, assigns ranks, tracks tester activity, and displays leaderboards — all through slash commands and buttons.

Perfect for PvP / SMP / gamemode tierlists where staff test players and assign ranks.

---

## Features

- 🧾 Create and manage tierlist queues per gamemode  
- 🔘 Button-based queue joining  
- 🧑‍⚖️ Tester-only commands with admin override  
- 🏆 Rank players and automatically manage Discord roles  
- 📊 Persistent leaderboards per tierlist  
- 🧠 Remembers previous ranks and removes old roles  
- 🎟️ Optional auto ticket creation for queued players  
- 💾 Data saved locally using JSON files  

---

## Requirements

- **Node.js v16+**
- A Discord bot application
- A Discord server where you have admin permissions

---

## Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/tierlist-bot.git
   cd tierlist-bot
   ```

2. Install dependencies
   ```bash
   npm install discord.js
   ```

3. Configure the bot  
   Edit `config.json` and fill in:
   - Bot token
   - Channel IDs
   - Role IDs for testers
   - Rank role IDs
   - Queue limits

4. Start the bot
   ```bash
   node index.js
   ```

If successful, you should see:
```
Tierlist bot online 😎
```

---
If using bought server then set it to launch from index.js
## Configuration (`config.json`)

Each tierlist (e.g. `mace`, `sword`, `axe`, `smp`) supports:

- `roleID` – Role required to manage that tierlist  
- `channelID` – Channel where the queue is posted  
- `maxQueue` – Maximum queue size  
- `rankRoles` – Role IDs assigned for each tier  
- `ticketCategoryID` *(optional)* – Category for ticket channels  

Example:
```json
"mace": {
  "roleID": "TESTER_ROLE_ID",
  "channelID": "QUEUE_CHANNEL_ID",
  "maxQueue": 20,
  "rankRoles": {
    "Champion-Tier": "ROLE_ID",
    "Contender-Tier": "ROLE_ID"
  }
}
```

---

## Commands

### /queue
Start a tierlist queue  
**Permission:** Tester role or Administrator  

### /stopqueue
Stop an active queue  

### /leaderboard
View ranked players for a tierlist  

### /rank
Assign a rank to a player  
Automatically updates:
- Discord roles
- Leaderboard stats
- Previous rank removal

**Options:**
- Discord user
- Tierlist
- Rank (auto-complete)
- Minecraft IGN

### /addtester & /removetester
Add or remove testers from a queue

---

## Queue System

- Players join using a **Join Queue** button  
- Queue updates every **10 seconds**
- Auto ticket creation for the first player (optional)
- Tickets close automatically once ranked

---

## Data Storage

- `leaderboard.json` – Number of tests per player
- `lastRanks.json` – Last assigned rank per tierlist

These files persist between restarts.

---

## Permissions

Bot requires:
- Manage Roles
- Manage Channels (for tickets)
- Send Messages
- Use Slash Commands

⚠️ Bot role must be **above all rank roles**

---

## License

Apache License

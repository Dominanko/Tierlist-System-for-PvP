"use strict";

const { Client, Intents, MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");
const fs = require("fs");

// Load config
const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
let leaderboard = fs.existsSync("leaderboard.json") ? JSON.parse(fs.readFileSync("leaderboard.json", "utf8")) : {};
let lastRanks = fs.existsSync("lastRanks.json") ? JSON.parse(fs.readFileSync("lastRanks.json", "utf8")) : {};

const bot = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

// queues[tier] = { users: [], testers: [], message, ticketChannel }
const queues = {};

bot.once("ready", async () => {
  console.log("Tierlist bot online 😎");

  const guild = bot.guilds.cache.first();
  if (!guild) return;
  const tiers = Object.keys(config.tierlists);

  // Register slash commands
  await guild.commands.set([
    {
      name: "queue",
      description: "Create a tierlist queue",
      options: [{ type: "STRING", name: "tier", description: "Which tierlist queue", required: true, choices: tiers.map(t => ({ name: t.toUpperCase(), value: t })) }]
    },
    {
      name: "stopqueue",
      description: "Stop a tierlist queue",
      options: [{ type: "STRING", name: "tier", description: "Which tierlist queue", required: true, choices: tiers.map(t => ({ name: t.toUpperCase(), value: t })) }]
    },
    {
      name: "leaderboard",
      description: "View tierlist leaderboard",
      options: [{ type: "STRING", name: "tier", description: "Which tierlist", required: true, choices: tiers.map(t => ({ name: t.toUpperCase(), value: t })) }]
    },
    {
      name: "rank",
      description: "Assign a rank to a player",
      options: [
        { type: "USER", name: "user", description: "Discord user tested", required: true },
        { type: "STRING", name: "tier", description: "Which tierlist", required: true, choices: tiers.map(t => ({ name: t.toUpperCase(), value: t })) },
        { type: "STRING", name: "rank", description: "Tier rank", required: true, autocomplete: true },
        { type: "STRING", name: "username", description: "Minecraft IGN", required: true }
      ]
    },
    {
      name: "addtester",
      description: "Add a tester to a queue",
      options: [
        { type: "USER", name: "user", description: "Tester to add", required: true },
        { type: "STRING", name: "tier", description: "Tierlist queue", required: true, choices: tiers.map(t => ({ name: t.toUpperCase(), value: t })) }
      ]
    },
    {
      name: "removetester",
      description: "Remove a tester from a queue",
      options: [
        { type: "USER", name: "user", description: "Tester to remove", required: true },
        { type: "STRING", name: "tier", description: "Tierlist queue", required: true, choices: tiers.map(t => ({ name: t.toUpperCase(), value: t })) }
      ]
    }
  ]);
});

// AUTO-COMPLETE ranks
bot.on("interactionCreate", async interaction => {
  if (interaction.isAutocomplete() && interaction.commandName === "rank") {
    const tier = interaction.options.getString("tier");
    if (!tier || !config.tierlists[tier]) return interaction.respond([]);
    const ranks = Object.keys(config.tierlists[tier].rankRoles);
    return interaction.respond(ranks.map(r => ({ name: r, value: r })));
  }

  // BUTTON join queue
  if (interaction.isButton()) {
    const [, tier] = interaction.customId.split("_");
    const q = queues[tier];
    if (!q) return interaction.reply({ content: "Queue closed.", ephemeral: true });
    if (q.users.includes(interaction.user.id)) return interaction.reply({ content: "Already in queue.", ephemeral: true });
    if (q.users.length >= config.tierlists[tier].maxQueue) return interaction.reply({ content: "Queue full 🚫", ephemeral: true });

    q.users.push(interaction.user.id);

    return interaction.reply({ content: "Joined queue ✅", ephemeral: true });
  }

  if (!interaction.isCommand()) return;

  const tier = interaction.options.getString("tier");
  const tierCfg = config.tierlists[tier];
  const member = interaction.member;
  const isTester = member.roles.cache.has(tierCfg.roleID);
  const isAdmin = member.permissions.has("ADMINISTRATOR");

  // QUEUE
  if (interaction.commandName === "queue") {
    if (!isTester && !isAdmin) return interaction.reply({ content: "❌ No permission.", ephemeral: true });
    const channel = interaction.guild.channels.cache.get(tierCfg.channelID);
    const button = new MessageActionRow().addComponents(new MessageButton().setCustomId(`join_${tier}`).setLabel("Join Queue").setStyle("PRIMARY"));
    const msg = await channel.send({ content: "@here", embeds: [new MessageEmbed().setTitle(`${tier.toUpperCase()} Queue`).setDescription("Queue is empty")], components: [button] });
    queues[tier] = { users: [], testers: [member.id], message: msg, ticketChannel: null };
    return interaction.reply({ content: `Queue started in <#${tierCfg.channelID}> ✅`, ephemeral: true });
  }

  // STOP QUEUE
  if (interaction.commandName === "stopqueue") {
    if (!isTester && !isAdmin) return interaction.reply({ content: "❌ No permission.", ephemeral: true });
    if (!queues[tier]) return interaction.reply({ content: "No queue running.", ephemeral: true });
    if (queues[tier].message) await queues[tier].message.delete();
    if (queues[tier].ticketChannel) {
      const ticket = interaction.guild.channels.cache.get(queues[tier].ticketChannel);
      if (ticket) await ticket.delete();
    }
    delete queues[tier];
    return interaction.reply({ content: `Queue closed by <@${member.id}> ✅`, ephemeral: true });
  }

  // LEADERBOARD
  if (interaction.commandName === "leaderboard") {
    const ranks = lastRanks[tier] || {};
    const order = Object.keys(tierCfg.rankRoles);
    let desc = "";
    for (const r of order) {
      const users = Object.entries(ranks).filter(([_, rank]) => rank === r).map(([id]) => `<@${id}>`);
      if (users.length) desc += `**${r}**\n${users.map(u => `• ${u}`).join("\n")}\n\n`;
    }
    return interaction.reply({ embeds: [new MessageEmbed().setTitle(`${tier.toUpperCase()} Tierlist`).setDescription(desc || "No players ranked yet.")] });
  }

  // RANK PLAYER
  if (interaction.commandName === "rank") {
    if (!isTester && !isAdmin) return interaction.reply({ content: "❌ No permission.", ephemeral: true });

    const user = interaction.options.getUser("user");
    const rankName = interaction.options.getString("rank");
    const mcIGN = interaction.options.getString("username");
    const target = interaction.guild.members.cache.get(user.id);

    const prevRank = lastRanks[tier]?.[user.id] || "None";

    if (prevRank !== "None") {
      const oldRole = tierCfg.rankRoles[prevRank];
      if (oldRole) await target.roles.remove(oldRole);
    }

    await target.roles.add(tierCfg.rankRoles[rankName]);

    lastRanks[tier] ??= {};
    lastRanks[tier][user.id] = rankName;
    fs.writeFileSync("lastRanks.json", JSON.stringify(lastRanks, null, 2));

    leaderboard[tier] ??= {};
    leaderboard[tier][user.id] = (leaderboard[tier][user.id] || 0) + 1;
    fs.writeFileSync("leaderboard.json", JSON.stringify(leaderboard, null, 2));

    if (queues[tier]) queues[tier].users.shift();

    // Delete ticket if exists
    if (queues[tier]?.ticketChannel) {
      const ticket = interaction.guild.channels.cache.get(queues[tier].ticketChannel);
      if (ticket) await ticket.delete();
      delete queues[tier].ticketChannel;
    }

    // Send result in current channel with player head
    const embed = new MessageEmbed()
      .setTitle("Test Result 🏆")
      .setThumbnail(`https://minotar.net/avatar/${encodeURIComponent(mcIGN)}/64`)
      .addFields(
        { name: "Discord User", value: `<@${user.id}>`, inline: true },
        { name: "Minecraft Username", value: mcIGN, inline: true },
        { name: "Gamemode", value: tier.toUpperCase(), inline: true },
        { name: "Tier Earned", value: rankName, inline: true },
        { name: "Previous Tier", value: prevRank, inline: true },
        { name: "Tester", value: `<@${interaction.user.id}>`, inline: true }
      )
      .setFooter({ text: "Tierlist System" });

    return interaction.reply({ embeds: [embed] });
  }
});

// QUEUE UPDATE interval (10s)
setInterval(async () => {
  for (const tier in queues) {
    const q = queues[tier];
    if (!q || !q.message) continue;

    // Update queue embed
    const embed = new MessageEmbed()
      .setTitle(`${tier.toUpperCase()} Queue`)
      .setDescription(
        `**Testers**: ${q.testers.map(id => `<@${id}>`).join(", ") || "None"}\n\n` +
        `**Queue (${q.users.length})**\n${q.users.map((u, i) => `${i + 1}. <@${u}>`).join("\n") || "Empty"}`
      );
    q.message.edit({ content: null, embeds: [embed] }).catch(() => {});

    // Auto-create ticket for #1 if ticketChannel not set
    if (q.users.length > 0 && !q.ticketChannel && config.tierlists[tier].ticketCategoryID) {
      const firstUserId = q.users[0];
      const category = q.message.guild.channels.cache.get(config.tierlists[tier].ticketCategoryID);
      if (category) {
        const ticket = await q.message.guild.channels.create(`${tier}-${firstUserId}`, {
          type: "GUILD_TEXT",
          parent: category,
          permissionOverwrites: [
            { id: q.message.guild.id, deny: ["VIEW_CHANNEL"] },
            { id: firstUserId, allow: ["VIEW_CHANNEL"] },
            { id: q.testers[0], allow: ["VIEW_CHANNEL"] }
          ]
        });
        await ticket.send(`Queue started! <@${firstUserId}> <@${q.testers[0]}>`);
        q.ticketChannel = ticket.id;
      }
    }
  }
}, 10000);

bot.login(config.token);

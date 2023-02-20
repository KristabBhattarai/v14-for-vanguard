const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

const { QuickDB } = require("quick.db");
const db = new QuickDB();
const fs = require("fs");
const config = require("../../config");
const mysql = require("mysql");

const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

//this is my database
let db_config = {
  host: "localhost",
  user: "root",
  password: "",
  database: "101m",
};

//this is mysql connection (anti crash) command
var connection;
function handleDisconnect() {
  connection = mysql.createConnection(db_config); // Recreate the connection, since
  // the old one cannot be reused.
  connection.connect(function (err) {
    // The server is either down
    if (err) {
      // or restarting (takes a while sometimes).
      console.log("error when connecting to db:", err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    } // to avoid a hot loop, and to allow our node script to
  }); // process asynchronous requests in the meantime.
  console.log("MySQL connection was completed successfully.");
  connection.on("error", function (err) {
    console.log("db error", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      // Connection to the MySQL server is usually
      handleDisconnect(); // lost due to either server restart, or a
    } else {
      // connnection idle timeout (the wait_timeout
      throw err; // server variable configures this)
    }
  });
}
handleDisconnect();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sorguad2")
    .setDescription("Ad Soyad Sorgu-2"),

  run: async (client, interaction) => {
    const now = Date.now();

    let sorguAd;
    let sorguSoyad;
    let sorguIl;
    let sorguIlce;
    let sorguDogumt;

    const modal = new ModalBuilder()
      .setCustomId("InfoFormId")
      .setTitle("Info Form");

    const Input1 = new TextInputBuilder()
      .setCustomId("ad")
      .setLabel(`Ad`)
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    const Input2 = new TextInputBuilder()
      .setCustomId("soyad")
      .setLabel(`Soyad`)
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    const Input3 = new TextInputBuilder()
      .setCustomId("il")
      .setLabel(`il`)
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    const Input4 = new TextInputBuilder()
      .setCustomId("ilce")
      .setLabel(`ilce`)
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    const Input5 = new TextInputBuilder()
      .setCustomId("dogumt")
      .setLabel(`dogumt`)
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    const firstActionRow = new ActionRowBuilder().addComponents(Input1);

    const secondActionRow = new ActionRowBuilder().addComponents(Input2);

    const thirdActionRow = new ActionRowBuilder().addComponents(Input3);

    const fourthActionRow = new ActionRowBuilder().addComponents(Input4);

    const fifthActionRow = new ActionRowBuilder().addComponents(Input5);

    modal.addComponents(
      firstActionRow,
      secondActionRow,
      thirdActionRow,
      fourthActionRow,
      fifthActionRow
    );

    await interaction.showModal(modal);

    const filter = (interaction) => {
      return interaction.customId === "InfoFormId";
    };

    interaction.awaitModalSubmit({ filter }).then((interaction) => {
      sorguAd = interaction.fields.getTextInputValue("Input1");
      sorguSoyad = interaction.fields.getTextInputValue("Input2");
      sorguIl = interaction.fields.getTextInputValue("Input3");
      sorguIlce = interaction.fields.getTextInputValue("Input4");
      sorguDogumt = interaction.fields.getTextInputValue("Input5");

      return interaction
        .reply({
          content: "Modal is submitted!",
          ephemeral: true,
        })
        .catch(console.error);
    });

    //this is sql commands to search/query (no need to change)
    let sqlSorgusu = `SELECT * FROM 101m WHERE ADI like '%${sorguAd}%' `;
    if (sorguSoyad) {
      sqlSorgusu += `AND SOYADI like '${sorguSoyad}' `;
    }
    if (sorguIl) {
      sqlSorgusu += `AND NUFUSIL like '${sorguIl}' `;
    }
    if (sorguIlce) {
      sqlSorgusu += `AND NUFUSILCE like '${sorguIlce}' `;
    }
    if (sorguDogumt) {
      sqlSorgusu += `AND DOGUMTARIHI like '%${sorguDogumt}%' `;
    }

    //this part is result. (i think, no need to change there too)
    connection.query(sqlSorgusu, async function (err, results, fields) {
      if (err) throw err;
      if (results.length == 0) {
        await interaction.editReply({ content: "No Records Found." });
      } else {
        if (results.length > 120)
          await interaction.editReply({ content: "Keep Waiting." });

        const stream = await fs.createWriteStream(
          `./data/${now}-${sorguAd}.ino`
        );
        stream.once("open", async () => {
          stream.write(`Date: ${new Date(now).toLocaleString()}`);
          stream.write(`\n${results.length} record(s) found.`);
          for (const kayit of results) {
            await stream.write(
              `\n\nTC: ${kayit.TC}\nAD: ${kayit.ADI}\nSOYAD: ${kayit.SOYADI}\nDOĞUM TARİHİ: ${kayit.DOGUMTARIHI}\nNÜFUS İL: ${kayit.NUFUSIL}\nNÜFUS İLÇE: ${kayit.NUFUSILCE}\nANNE ADI: ${kayit.ANNEADI}\nANNE TC: ${kayit.ANNETC}\nBABA ADI: ${kayit.BABAADI}\nBABA TC: ${kayit.BABATC}\nUYRUK: ${kayit.UYRUK}`
            );
          }
          stream.end();
        });

        stream.on("finish", async () => {
          await interaction
            .editReply({
              content: ` `,
              files: [`./data/${now}-${sorguAd}.ino`],
            })
            .catch(async (err) => {
              await interaction.editReply({ content: `Error!` });
            });
        });
        setTimeout(
          () =>
            fs.unlink(`./data/${now}-${sorguAd}.ino`, (err) => {
              if (err) throw err;
            }),
          5000
        );
      }
    });
    //this part is log. (i think, no need to change there too)
    const logs = client.channels.cache.get(config.logchannel);
    if (logs) {
      const Log = new EmbedBuilder()
        .setAuthor({
          name: ` ${interaction.user.username}#${interaction.user.discriminator}`,
          iconURL: interaction.user.displayAvatarURL({ size: 2048 }),
        })
        .setColor("#00CD19")
        .addFields({
          name: ` `,
          value: `/sorguad2 ${sorguAd} ${sorguSoyad} ${sorguIl}`,
          inline: false,
        })
        .setTimestamp()
        .setFooter({ text: `Na/Eu` });
      logs.send({ embeds: [Log] });
    }

    // return;
  },
};

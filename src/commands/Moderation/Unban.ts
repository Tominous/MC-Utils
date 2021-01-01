import { getModelForClass } from "@typegoose/typegoose";
import { Command } from "discord-akairo";
import { User, Message, MessageEmbed } from "discord.js";
import { utc } from "moment";
import memberModel from "../../models/MemberModel";
import Logger from "../../structures/Logger";
import uniqid from "uniqid";

export default class Unban extends Command {
    public constructor() {
        super("unban", {
            aliases: ["unban", "pardon"],
            category: "Moderation",
            channel: "guild",
            description: {
                content: "Bans a member in the server.",
                usage: "unban [ID or Mention] <reason>",
                examples: ["unban @Axis#0001 Reversal"]
            },
            ratelimit: 3,
            userPermissions: ["BAN_MEMBERS"],
            args: [
                {
                    id: "user",
                    type: "user",
                    prompt: {
                        start: (msg: Message) =>
                            `${msg.author}, please provide a member to unban...`,
                        retry: (msg: Message) =>
                            `${msg.author}, please provide a valid member to unban...`
                    }
                },
                {
                    id: "reason",
                    type: "string",
                    match: "rest",
                    default: ""
                }
            ]
        })
    }

    public async exec(
        message: Message,
        { user, reason }: { user: User; reason: string }
    ): Promise<Message> {
        const embed = new MessageEmbed().setColor(0x00ff0c);
        let dateString: string = utc().format("MMMM Do YYYY, h:mm:ss a");
        let userId = user.id;
        let guildID = message.guild.id;

        let caseNum = uniqid();
        const caseInfo = {
          caseID: caseNum,
          moderator: message.author.id,
          moderatorId: message.author.id,
          user: `${user.tag} (${user.id})`,
          date: dateString,
          type: "Unban",
          reason,
        };

        const sanctionsModel = getModelForClass(memberModel);
        try {
            await message.guild.members.unban(user.id, reason);
        } catch (e) {
            embed.setDescription(`Couldn't unban user because of: **${e}**`);
            return message.util.send(embed);
        }
        try {
          await sanctionsModel.findOneAndUpdate(
            {
              guildId: guildID,
              id: userId
            },
            {
              guildId: guildID,
              id: userId,
              $push: {
                sanctions: caseInfo
              }
            },
            {
              upsert: true
            }
          ).catch((e) => message.channel.send(`Error Logging Kick to DB: ${e}`));
        } catch(e) {
          Logger.error("DB", e);
        }
    }
}
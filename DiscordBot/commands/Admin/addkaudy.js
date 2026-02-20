const { MessageEmbed } = require("discord.js");
const path = require("path");
const fs = require("fs").promises; // Usando versão com promises
const Users = require('../../../model/user.js');
const Profiles = require('../../../model/profiles.js');
const destr = require("destr");
const config = require('../../../Config/config.json');

module.exports = {
    commandInfo: {
        name: "addkaudy",
        description: "Adiciona todos os cosméticos ao inventário do usuário (resetará os locker atuais)",
        options: [
            {
                name: "user",
                description: "Usuário que receberá os itens",
                required: true,
                type: 6
            }
        ]
    },
    execute: async (interaction) => {
        // Função auxiliar para responder consistentemente
        const safeReply = async (content, isError = false) => {
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(content);
                } else {
                    await interaction.reply({
                        ...content,
                        ephemeral: isError
                    });
                }
                return true;
            } catch (error) {
                console.error("Erro ao responder interação:", error);
                return false;
            }
        };

        try {
            // 1. Verificação inicial rápida
            if (!config.moderators.includes(interaction.user.id)) {
                return await safeReply({
                    content: "❌ Você não tem permissão para usar este comando."
                }, true);
            }

            // 2. Adiar resposta para ganhar tempo
            if (!interaction.deferred) {
                await interaction.deferReply({ ephemeral: true });
            }

            // 3. Processamento principal
            const selectedUser = interaction.options.getUser('user');
            if (!selectedUser) {
                return await safeReply({
                    content: "❌ Usuário não especificado."
                }, true);
            }

            const targetUser = await Users.findOne({ discordId: selectedUser.id }).lean();
            if (!targetUser) {
                return await safeReply({
                    content: "❌ Conta não encontrada para este usuário."
                }, true);
            }

            // 4. Leitura assíncrona do arquivo
            const filePath = path.join(__dirname, "../../../Config/DefaultProfiles/addkaudy.json");
            let fileContent;
            
            try {
                fileContent = await fs.readFile(filePath, 'utf8');
            } catch (error) {
                console.error("Erro ao ler arquivo:", error);
                return await safeReply({
                    content: "❌ Arquivo de cosméticos não encontrado ou inacessível."
                }, true);
            }

            const allItems = destr(fileContent);
            if (!allItems?.items) {
                return await safeReply({
                    content: "❌ Formato inválido no arquivo de cosméticos."
                }, true);
            }

            // 5. Atualização do banco de dados
            try {
                const updateResult = await Profiles.updateOne(
                    { accountId: targetUser.accountId },
                    { $set: { "profiles.athena.items": allItems.items } },
                    { upsert: true }
                );

                if (updateResult.modifiedCount === 0 && updateResult.upsertedCount === 0) {
                    return await safeReply({
                        content: "❌ Nenhuma alteração foi aplicada."
                    }, true);
                }
            } catch (error) {
                console.error("Erro no banco de dados:", error);
                return await safeReply({
                    content: "❌ Falha ao atualizar o perfil no banco de dados."
                }, true);
            }

            // 6. Resposta de sucesso
            const embed = new MessageEmbed()
                .setTitle("✅ Locker Completo Adicionado")
                .setDescription(`Todos os cosméticos foram adicionados para ${selectedUser.toString()}`)
                .addField("Conta", targetUser.username || "N/A", true)
                .addField("Account ID", targetUser.accountId || "N/A", true)
                .setColor("#00FF00")
                .setFooter({
                    text: "Sistema Chaos",
                    iconURL: "https://i.imgur.com/PryVlcv.png"
                })
                .setTimestamp();

            await safeReply({ embeds: [embed] });

        } catch (error) {
            console.error("Erro não tratado no comando:", error);
            await safeReply({
                content: "⚠️ Ocorreu um erro crítico durante a execução."
            }, true);
        }
    }
};
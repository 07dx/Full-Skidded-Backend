const { MessageEmbed } = require("discord.js");
const path = require("path");
const fs = require("fs");
const Users = require('../../../model/user.js');
const Profiles = require('../../../model/profiles.js');
const log = require("../../../structs/log.js");
const destr = require("destr");
const config = require('../../../Config/config.json');

module.exports = {
    commandInfo: {
        name: "addchaos",
        description: "Adiciona todos os cosméticos ao inventário do usuário (resetará os locker atuais)",
        options: [
            {
                name: "user",
                description: "Usuário que receberá os itens",
                required: true,
                type: 6 // USER type
            }
        ]
    },
    execute: async (interaction) => {
        console.log("[ADDCHAOS] Comando iniciado"); // Log de depuração

        // Verificação de permissões
        if (!config.moderators.includes(interaction.user.id)) {
            console.log(`[ADDCHAOS] Acesso negado para ${interaction.user.id}`);
            return interaction.reply({ content: "❌ Você não tem permissão para usar este comando.", ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Passo 1: Validação do usuário alvo
            const selectedUser = interaction.options.getUser('user');
            if (!selectedUser) {
                console.log("[ADDCHAOS] Usuário não encontrado nas opções");
                return interaction.editReply({ content: "❌ Usuário não especificado." });
            }

            console.log(`[ADDCHAOS] Processando usuário: ${selectedUser.tag} (${selectedUser.id})`);

            // Passo 2: Busca o usuário no banco de dados
            const targetUser = await Users.findOne({ discordId: selectedUser.id }).lean();
            if (!targetUser) {
                console.log(`[ADDCHAOS] Conta não encontrada para ${selectedUser.tag}`);
                return interaction.editReply({ content: "❌ Conta não encontrada para este usuário." });
            }

            console.log(`[ADDCHAOS] AccountId encontrado: ${targetUser.accountId}`);

            // Passo 3: Carregar o arquivo de cosméticos
            const filePath = path.join(__dirname, "../../../Config/DefaultProfiles/allchaos.json");
            console.log(`[ADDCHAOS] Tentando ler arquivo em: ${filePath}`);

            if (!fs.existsSync(filePath)) {
                console.log("[ADDCHAOS] Arquivo allchaos.json não encontrado");
                return interaction.editReply({ content: "❌ Arquivo de cosméticos não encontrado." });
            }

            let allItems;
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                allItems = destr(fileContent);
                
                if (!allItems?.items) {
                    console.log("[ADDCHAOS] Estrutura inválida no allchaos.json", allItems);
                    return interaction.editReply({ content: "❌ Formato inválido no arquivo de cosméticos." });
                }
            } catch (err) {
                console.log("[ADDCHAOS] Erro ao analisar JSON:", err);
                return interaction.editReply({ content: "❌ Erro ao ler arquivo de cosméticos." });
            }

            // Passo 4: Atualização do perfil
            console.log(`[ADDCHAOS] Atualizando perfil para accountId: ${targetUser.accountId}`);
            
            try {
                const updateResult = await Profiles.updateOne(
                    { accountId: targetUser.accountId },
                    { $set: { "profiles.athena.items": allItems.items } },
                    { upsert: true }
                );

                console.log(`[ADDCHAOS] Resultado da atualização:`, updateResult);

                if (updateResult.modifiedCount === 0 && updateResult.upsertedCount === 0) {
                    console.log("[ADDCHAOS] Nenhum documento foi modificado");
                    return interaction.editReply({ content: "❌ Nenhuma alteração foi aplicada (perfil não encontrado ou já atualizado)." });
                }
            } catch (err) {
                console.log("[ADDCHAOS] Erro no banco de dados:", err);
                return interaction.editReply({ content: "❌ Erro grave ao atualizar o banco de dados." });
            }

            // Passo 5: Confirmação de sucesso
            console.log(`[ADDCHAOS] Cosméticos adicionados com sucesso para ${selectedUser.tag}`);

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

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("[ADDCHAOS] Erro não tratado:", error);
            log.error(error);
            await interaction.editReply({ content: "⚠️ Ocorreu um erro inesperado durante a execução." });
        }
    }
};
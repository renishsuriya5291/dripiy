// utils/personalizeMessage.js
function personalizeMessage(template, lead) {
    return template
        .replace(/%%first_name%%/gi, lead.firstName || '')
        .replace(/%%last_name%%/gi, lead.lastName || '')
        .replace(/%%company%%/gi, lead.company || '')
        .replace(/%%position%%/gi, lead.position || '');
}

module.exports = personalizeMessage;

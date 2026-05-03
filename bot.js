const express = require('express');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Configurações
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USER = 'nicolassantos000010-ui';
const GITHUB_REPO = 'NexiUS-bot-loadstring-maker';
const GITHUB_BRANCH = 'main';

// Função para fazer push no GitHub
async function pushToGitHub(filename, content) {
  const filePath = `scripts/${filename}`;
  const url = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${filePath}`;

  try {
    // Tenta obter o SHA do arquivo (se já existe)
    let sha = null;
    try {
      const response = await axios.get(url, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      sha = response.data.sha;
    } catch (error) {
      // Arquivo não existe, continua sem SHA
    }

    // Faz o push
    const data = {
      message: `Add script: ${filename}`,
      content: Buffer.from(content).toString('base64'),
      branch: GITHUB_BRANCH,
    };

    if (sha) {
      data.sha = sha;
    }

    const pushResponse = await axios.put(url, data, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    // Gera a URL raw
    const rawUrl = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${filePath}`;

    return {
      success: true,
      filename: filename,
      githubUrl: pushResponse.data.html_url,
      rawUrl: rawUrl,
      loadstringCommand: `loadstring(game:HttpGet("${rawUrl}"))()`,
    };
  } catch (error) {
    console.error('Erro ao fazer push:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
}

// Rota para receber scripts
app.post('/upload', upload.single('script'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const filename = `${Date.now()}_${req.file.originalname}`;
  const content = req.file.buffer.toString('utf-8');

  const result = await pushToGitHub(filename, content);

  if (result.success) {
    res.json({
      message: 'Script hospedado com sucesso!',
      ...result,
    });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// Rota de teste
app.get('/health', (req, res) => {
  res.json({ status: 'Bot funcionando!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Bot rodando na porta ${PORT}`);
});

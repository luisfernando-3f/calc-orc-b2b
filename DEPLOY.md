# Deploy na VPS Hostinger (Ubuntu) — passo a passo

Sistema: **Calculadora de Previsão de Resultados — SEED** (Next.js). Guarda os dados em
arquivos na pasta `data/` (config, simulações, campanhas, usuários) — por isso uma VPS
(servidor Linux com disco) é ideal.

> Tempo estimado: 30–45 min. Copie e cole os comandos na ordem.
> Onde aparecer `SEU_...`, troque pelo seu valor.
> **Roda na porta 3100** (para poder coexistir com o `dre-control`, que usa a 3000).

---

## 0. O que você precisa antes de começar

- Uma **VPS Hostinger** com **Ubuntu 22.04 ou 24.04 (LTS)**.
- O **IP da VPS** e a **senha de root** (hPanel → VPS → Acesso SSH).
- **Fortemente recomendado:** um **domínio/subdomínio** (ex.: `calc.suaempresa.com.br`)
  para ter **HTTPS**. Sem HTTPS, as senhas de login trafegam expostas. Crie um registro
  **A** apontando para o IP da VPS.

> Se você já tem o `dre-control` rodando nesta VPS, pule os passos 1–3 e 7 (Node, usuário,
> Nginx já estão instalados) e vá direto para colocar o código (passo 4).

---

## 1. Conectar na VPS por SSH

```bash
ssh root@SEU_IP_DA_VPS
```

---

## 2. Atualizar o sistema e criar um usuário (segurança)

```bash
apt update && apt upgrade -y
adduser deploy            # crie uma senha para o usuário 'deploy'
usermod -aG sudo deploy
su - deploy
```

Firewall:

```bash
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

---

## 3. Instalar Node.js 22 (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git
node -v    # deve mostrar v22.x
```

---

## 4. Colocar o código na VPS

### Opção A — via GitHub (recomendado)

Suba o projeto para um repositório **privado** no GitHub. Depois, na VPS:

```bash
cd ~
git clone https://github.com/SEU_USUARIO/calculadora-seed.git
cd calculadora-seed
```

### Opção B — enviar do seu Mac (sem GitHub)

No **seu Mac**, dentro de `Code App`:

```bash
cd "/Users/luisfernandomenti/Code App"
rsync -av --exclude node_modules --exclude .next --exclude data \
  calculadora-seed/ deploy@SEU_IP_DA_VPS:~/calculadora-seed/
```

Depois volte ao SSH da VPS: `cd ~/calculadora-seed`.

---

## 5. Definir o segredo de sessão (AUTH_SECRET)

O `AUTH_SECRET` assina o cookie de login. **Sem um segredo forte, qualquer um poderia
forjar uma sessão.** Gere um aleatório e salve no `.env.production`:

```bash
echo "AUTH_SECRET=$(openssl rand -hex 32)" > .env.production
cat .env.production   # confira que gerou uma linha AUTH_SECRET=... longa
```

> Os usuários iniciais (`luisfernando@3fventure.com.br` e `juliano@3fventure.com.br`,
> senha `1234`) são criados automaticamente na primeira vez, já com **hash**. Depois de
> subir, **entre como admin e troque as senhas / crie os logins reais** em
> *Administração → Vendedores*. As senhas ficam com hash em `data/users.json`.

---

## 6. Instalar dependências e gerar o build

```bash
npm ci
npm run build
```

---

## 7. Manter no ar com PM2 (porta 3100)

```bash
sudo npm install -g pm2
pm2 start npm --name calculadora-seed -- start   # o script "start" já sobe na porta 3100
pm2 save
pm2 startup systemd -u deploy --hp /home/deploy
```

O último comando imprime uma linha começando com `sudo env ...` — copie e rode ela para o
app voltar sozinho após um reboot.

Úteis:

```bash
pm2 status
pm2 logs calculadora-seed
pm2 reload calculadora-seed
```

---

## 8. Nginx como porta de entrada (80/443 → 3100)

```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/calculadora-seed
```

Cole (troque `SEU_DOMINIO`; sem domínio, use o IP):

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative e reinicie:

```bash
sudo ln -s /etc/nginx/sites-available/calculadora-seed /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

> Se o `dre-control` já usa o `default` do Nginx, **não** remova o default; apenas cada
> app fica num `server_name` (domínio) diferente.

---

## 9. HTTPS grátis (Let's Encrypt) — só com domínio

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d SEU_DOMINIO
```

Pronto: acesse **https://SEU_DOMINIO** e faça login.

---

## 10. Como atualizar depois

```bash
cd ~/calculadora-seed
git pull                # (ou reenvie via rsync — passo 4B)
npm ci
npm run build
pm2 reload calculadora-seed
```

---

## 11. Backup dos dados

Tudo (config, simulações, campanhas, usuários) fica em `~/calculadora-seed/data/`:

```bash
tar czf ~/backup-calc-$(date +%F).tar.gz -C ~/calculadora-seed data
```

Guarde em outro lugar. Para restaurar, extraia por cima da pasta `data/`.

---

## Primeiros passos depois do deploy

1. Acesse `https://SEU_DOMINIO` e entre como **admin** (`luisfernando@3fventure.com.br` /
   `1234`).
2. **Administração → Vendedores**: troque a senha do admin e crie os logins reais da
   equipe.
3. **Administração → Ponto de partida**: confira nichos/CPL, faixas e a regra da prestação.
4. Time comercial usa **Calculadora de Retorno** na call → **Gerar proposta** →
   **Copiar link do cliente** para o follow-up.

Dúvidas ou erros em qualquer passo: mande a mensagem de erro que o Claude ajuda.

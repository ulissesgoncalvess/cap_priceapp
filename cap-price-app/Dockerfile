# Dockerfile
# Use uma imagem Python oficial
FROM python:3.10-slim

# Define o diretório de trabalho
WORKDIR /app

# Copia o arquivo de dependências
COPY requirements.txt .

# Instala as dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código da aplicação
COPY . .

# Expõe a porta que o Gunicorn usará
EXPOSE 5000

# Comando para rodar a aplicação com Gunicorn
# 'run:app' refere-se ao objeto 'app' dentro de 'run.py'
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "run:app"]
# app/routes/main.py
from flask import Blueprint, render_template, jsonify, request
import requests  # Para chamar o n8n
import os        # Para ler variáveis de ambiente (bom para URLs)
import json      # Para tratar respostas do n8n

main_bp = Blueprint('main', __name__)

# --- COLOQUE AS URLs DE PRODUÇÃO DOS SEUS WORKFLOWS N8N AQUI ---
# (A URL do workflow 'CAP_PRICE_API_WEB')
N8N_SIMULATOR_WEBHOOK_URL = "https://automacoes-n8n.infrassys.com/webhook/mybranch"

# (A URL do workflow 'CAP_PRICE_CHAT_API')
N8N_CHAT_WEBHOOK_URL = "https://automacoes-n8n.infrassys.com/webhook/mybranch"
# -----------------------------------------------------------------

@main_bp.route('/')
@main_bp.route('/login')
def login():
    """Renderiza a página de login."""
    return render_template('login/login.html')

@main_bp.route('/precificar')
def precificar():
    """Renderiza a página principal da aplicação (precificador)."""
    return render_template('pages/precificar.html')

@main_bp.route('/api/simular', methods=['POST'])
def api_simular():
    """
    Endpoint da API para o SIMULADOR (Formulário).
    Chama o n8n com os dados do formulário e retorna o JSON da simulação.
    """
    try:
        data_do_frontend = request.json

        # 1. Formata um prompt de texto para o Agente (o n8n espera isso)
        prompt_para_agente = f"""
        Por favor, simule a melhor condição de preço com os seguintes dados:
        - Destino (UF): {data_do_frontend.get('destino_uf')}
        - Produto: {data_do_frontend.get('produto')}
        - Quantidade (ton): {data_do_frontend.get('quantidade')}
        - Preço Net (R$) Opcional: {data_do_frontend.get('preco_net') or 'Não informado'}
        - Refinaria Específica (Opcional): {data_do_frontend.get('refinaria') or 'Todas'}

        Lembre-se de retornar APENAS o JSON (ou array de JSONs) com os resultados.
        """

        # 2. Monta o payload para o n8n
        payload_para_n8n = {
            "texto_da_simulacao": prompt_para_agente
        }

        # 3. Chama o n8n e espera a resposta
        print(f"DEBUG: Enviando requisição para N8N: {N8N_SIMULATOR_WEBHOOK_URL}")
        response_n8n = requests.post(
            N8N_SIMULATOR_WEBHOOK_URL, 
            json=payload_para_n8n, 
            timeout=45
        )
        
        # --- DEBUG ---
        print(f"DEBUG N8N: Status Code: {response_n8n.status_code}")
        print(f"DEBUG N8N: Response Text: {response_n8n.text}")
        # -------------

        response_n8n.raise_for_status()

        # 4. Processa a resposta do n8n (que deve ser o JSON de resultado)
        try:
            # O n8n pode retornar o JSON como uma string.
            # Ex: "{\"origem\": \"...\", \"precoFinal\": 5577.78}"
            # ou "[{\"origem\": ...}]"
            json_response = json.loads(response_n8n.text)
            return jsonify(json_response), 200

        except json.JSONDecodeError:
            # Se o n8n retornar um JSON encapsulado, ex: {"output": "[{...}]"}
            try:
                n8n_json = response_n8n.json()
            except ValueError:
                # Se não for JSON de jeito nenhum
                return jsonify({
                    "status": "error", 
                    "message": f"Resposta inválida do N8N (não é JSON). Status: {response_n8n.status_code}. Conteúdo: {response_n8n.text[:200]}"
                }), 500

            if 'output' in n8n_json:
                try:
                    json_response = json.loads(n8n_json['output'])
                    return jsonify(json_response), 200
                except json.JSONDecodeError:
                     return jsonify({"status": "error", "message": "O campo 'output' do N8N não contém um JSON válido.", "data": n8n_json['output']}), 500
            else:
                return jsonify({"status": "error", "message": "Resposta da IA não é um JSON válido e não possui campo 'output'.", "data": response_n8n.text}), 500

    except requests.exceptions.Timeout:
        return jsonify({"status": "error", "message": "Ocorreu um timeout ao simular."}), 504
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@main_bp.route('/api/chat', methods=['POST'])
def api_chat():
    """
    Endpoint da API para o CHAT.
    Chama o n8n com a mensagem e session_id, e retorna a resposta de texto.
    """
    try:
        data = request.json
        user_message = data.get('message')
        session_id = data.get('session_id', 'default_web_session')

        if not user_message:
            return jsonify({"status": "error", "message": "Mensagem está vazia."}), 400

        # 1. Payload para o n8n (o n8n espera 'message' e 'session_id')
        payload_para_n8n = {
            "message": user_message,
            "session_id": session_id
        }

        # 2. Chama o n8n e espera a resposta
        response_n8n = requests.post(
            N8N_CHAT_WEBHOOK_URL, 
            json=payload_para_n8n, 
            timeout=45
        )
        response_n8n.raise_for_status()

        # 3. Processa a resposta do n8n (o agente de chat retorna texto)
        reply_message = response_n8n.text
        try:
            # Se o n8n retornar JSON (ex: {"output": "Olá"})
            n8n_json = response_n8n.json()
            if isinstance(n8n_json, dict) and 'output' in n8n_json:
                reply_message = n8n_json['output']
            elif isinstance(n8n_json, str):
                reply_message = n8n_json
        except json.JSONDecodeError:
            # Se for texto puro, já está correto
            pass

        # 4. Retorna a resposta para o JavaScript
        return jsonify({"reply": reply_message}), 200

    except requests.exceptions.Timeout:
        return jsonify({"reply": "Desculpe, o assistente demorou muito para responder."}), 504
    except Exception as e:
        return jsonify({"reply": f"Ocorreu um erro interno: {str(e)}"}), 500
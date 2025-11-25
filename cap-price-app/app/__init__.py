# app/__init__.py
from flask import Flask
import os

def create_app():
    app = Flask(__name__,
                static_folder='static',
                template_folder='templates')

    # Configurações (se houver, de config.py)
    # app.config.from_object('config.Config')

    with app.app_context():
        # Importa e registra as rotas
        from .routes import main
        app.register_blueprint(main.main_bp)

    return app
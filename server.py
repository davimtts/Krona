from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
import webbrowser

# Pasta onde este arquivo .py está
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# O site está na mesma pasta deste script
os.chdir(BASE_DIR)

HOST = "localhost"
PORT = 8000


class Handler(SimpleHTTPRequestHandler):
    # Evita poluir o terminal com cada requisição
    def log_message(self, format, *args):
        pass


server = ThreadingHTTPServer((HOST, PORT), Handler)

url = f"http://{HOST}:{PORT}"

print("=" * 45)
print(" Krona - servidor local")
print("=" * 45)
print(f"\nSite rodando em: {url}")
print("\nMantenha esta janela aberta enquanto usar o site.")
print("Feche esta janela para desligar o servidor.\n")

# Abre o site automaticamente no navegador
webbrowser.open(url)

try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nServidor encerrado.")
finally:
    server.server_close()

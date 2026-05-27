# Imagem oficial do Lavalink v4 (Java 17 incluso). Tag :4 acompanha a major version.
FROM ghcr.io/lavalink-devs/lavalink:4

# Application.yml é montado no diretório de trabalho do Lavalink.
COPY application.yml /opt/Lavalink/application.yml

# Porta padrão; o Render injeta PORT via env e o application.yml respeita LAVALINK_PORT.
EXPOSE 2333

# A entrypoint da imagem já roda o Lavalink — não precisa CMD.

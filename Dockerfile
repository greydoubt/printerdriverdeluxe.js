FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install required tools
RUN apt-get update && apt-get install -y \
    cups \
    cups-client \
    ghostscript \
    poppler-utils \
    file \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Copy script
COPY run.sh /app/run.sh
RUN chmod +x /app/run.sh

CMD ["/app/run.sh"]

# Maven Repository Mirroring

**[فارسی](./README.fa.md)**

This project provides a Maven mirror server built with **Fastify**, allowing you to **proxy** requests to multiple upstream Maven repositories. It includes a robust fallback mechanism to ensure artifacts are retrieved from the first available source, enhancing the reliability and availability of Maven dependencies.

Additionally, this tool is especially valuable for developers in regions affected by sanctions, such as **Iran**, who face restricted access to major Maven repositories. By acting as a proxy, this mirror server can help bypass such restrictions and ensure seamless access to necessary dependencies.

It also supports **caching** to improve performance by reducing latency and saving bandwidth. The cache duration is configurable, making it suitable for local use to speed up builds or as a server-side cache to minimize network requests.

## Table of Contents

- [Maven Repository Mirroring](#maven-repository-mirroring)
  - [Table of Contents](#table-of-contents)
    - [Configuration](#configuration)
  - [Usage](#usage)
    - [Use Case: Bypassing Sanctions](#use-case-bypassing-sanctions)
    - [Caching Features](#caching-features)
    - [Start the server:](#start-the-server)
  - [Running with Docker](#running-with-docker)
    - [Using docker compose](#using-docker-compose)
    - [Manual](#manual)
    - [Docker Example Explained](#docker-example-explained)
    - [Volume Management](#volume-management)
  - [Contributing](#contributing)
  - [License](#license)

### Configuration

If you want, edit `config.yml` to customize the settings:
  - Update the `REPOSITORIES` section to specify the Maven repositories you want to mirror.
  - Adjust other settings like port number, caching options, or proxy servers as needed.
  - Configure the cache duration with `CACHE_TIME` (in seconds).

Example configuration:

```yaml
PROXIES:
  nordvpn:
    host: nordvpn.com
    port: 2080
    protocol: http # Supported protocols: http, https, and socks

  private:
    host: myserver.com
    port: 2081
    protocol: socks
    auth:                  # optional: Authentication info
      username: myusername #
      password: mypassword #

  local:
    host: 127.0.0.1
    port: 1080
    protocol: socks

REPOSITORIES:
  - name: central
    url: https://repo1.maven.org/maven2
    proxy: nordvpn # optional: Select a proxy server

  - name: private-repo
    url: https://repo.mycompany.com/maven
    auth:                  # optional: Authentication info
      username: myusername #
      password: mypassword #

CACHE_TIME: 2592000 # Default cache time: 30 days (in seconds)
```

## Usage

### Use Case: Bypassing Sanctions
One significant application of this Maven mirror is to provide access to sanctioned regions like Iran. Due to international sanctions, developers in certain regions may face difficulty accessing popular Maven repositories. This mirror server can act as a proxy to bypass such restrictions by:

- Relaying requests to upstream Maven repositories through a central, accessible endpoint.
- Using proxy servers to connect to blocked repositories.
- Allowing full control over which upstream sources are accessed and how.

### Caching Features
This project supports file caching for increased performance:
- **Local Server Use**: Cache files locally to speed up repeated builds and reduce latency.
- **Server Use**: Reduce bandwidth usage by caching frequently accessed dependencies.

Configure caching duration with `CACHE_TIME` (default is 30 days) in the `config.yml`.

### Start the server:

1. Launch the Maven Mirror:

```bash
yarn start
```

2. Update your Gradle `build.gradle` files to point to your local mirror endpoint for Maven dependencies:

```groovy
buildscript {
    repositories {
        mavenLocal();
        maven { url "https://example.com:9443" } // Use your configured port
        ...
    }
}
allprojects {
    buildscript {
        repositories {
            mavenLocal()
            maven { url "https://example.com:9443" }
            ...
        }
    }
    repositories {
        mavenLocal()
        maven { url "https://example.com:9443" }
        ...
    }
}
```

3. Proceed with your Gradle builds as usual. Dependencies will be resolved through the mirror endpoint.

## Running with Docker

You can also run the Maven Repository Mirroring using Docker. This can simplify deployment and ensure consistency across different environments.

### Using docker compose

1. Make a `docker-compose.yml` with:

```yml
services:
  mirror:
    image: ghcr.io/aminnez/maven-mirror:latest
    restart: unless-stopped
    ports:
      - 9443:9443
    volumes:
      - ./config.yml:/home/app/config.yml
      - ./privkey.pem:/home/app/privkey.pem
      - ./cert.pem:/home/app/cert.pem
      - ./local-cache:/home/app/local-cache
```

2. Run

```bash
docker compose up -d
```

### Manual
To use the Docker image `aminnez/maven-mirror:latest`, follow these steps:

1. Pull the Docker image:

```bash
docker pull ghcr.io/aminnez/maven-mirror:latest
```

2. Run the Docker container, mapping port 9443 and attaching the config file and cache directory:

```bash
docker run -d \
-p 9443:9443 \
-v /your/config.yml:/home/app/config.yml \
-v /your/privkey.pem:/home/app/pivkey.pem \
-v /your/cert.pem:/home/app/cert.pem \
-v /your/local-cache:/home/app/local-cache \
aminnez/maven-mirror:latest
```

### Docker Example Explained

- `-d`: Run the container in the background.
- `-p 9443:9443`: Map port 9443 on the host to port 9443 inside the container.
- `-v /your/config.yml:/home/app/config.yml`: Bind the config file from your host to the container, allowing custom configurations.
- `-v /your/privkey.pem:/home/app/privkey.pem`: Bind the SSL private key from your host to the container for HTTPS configuration.
- `-v /your/cert.pem:/home/app/cert.pem`: Bind the SSL certificate from your host to the container for HTTPS configuration.
- `-v /your/local-cache:/home/app/local-cache`: Bind a local directory to store cached files, allowing persistent caching between container restarts.

### Volume Management
To manage the cache directory effectively, bind a volume to the `/home/app/local-cache` location. This allows for persistent data storage between container restarts, ensuring that cached files are retained.

Example volume binding for Docker:

```bash
-v /path/to/your-cache-directory:/home/app/local-cache
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository.
2. **Create a branch** for your feature (`git checkout -b feature/YourFeature`).
3. **Commit** your changes (`git commit -am 'Add YourFeature'`).
4. **Push** the branch (`git push origin feature/YourFeature`).
5. **Create a Pull Request**.

## License

This project is licensed under the [MIT License](LICENSE), allowing you to use, modify, and distribute the code freely. Make sure to read and understand the license terms before using the project.
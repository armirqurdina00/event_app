# Salsa Bachata Event App

![Version](https://img.shields.io/badge/version-v1.0-blue.svg)
![License](https://img.shields.io/badge/license-GPL-blue.svg)

## Description

Salsa City Guide - Discover local salsa, bachata, kizomba dance events and connect with Telegram and WhatsApp groups.

Web App: https://sabaki.dance/

API: https://backend.sabaki.dance/api/docs

## Table of Contents

- [Salsa Bachata Event App](#salsa-bachata-event-app)
  - [Description](#description)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Contributing](#contributing)
  - [License](#license)
  - [Contact](#contact)

## Installation

Set missing secret environment variables in frontend/.env.local.template and backend/.env/*.template. Rename files and delete suffix ".template".
Enable "Allow Offline Access" in Auth0 for your backend API to retrieve refresh tokens. Set the "offline_access" scope in your environment variable to make this possible.

## Usage

1. **Development Mode:**

   To run the app in development mode, use the following command:

   ```bash
   cd backend
   npm install
   npm run build
   npm run dev
   ```

   ```bash
   cd frontend
   npm install
   npm run build
   npm run dev
   ```

   This command will start the application and allow you to test and make changes as needed.

2. **Docker:**

   Alternatively, you can run the app using Docker. Follow these steps:

   ```bash
   docker-compose up --build
   ```

## Contributing

Join our [Whatsapp Group](https://chat.whatsapp.com/Gi4MKwu2YbpDu7qUjROg2L). 

## License

This project is licensed under the GNU General Public License (GPL) - see the [LICENSE](https://www.gnu.org/licenses/gpl-3.0.en.html) file for details. The GNU GPL is a "viral" license that requires anyone using or modifying GPL-licensed code to release their changes under the same GPL license. This ensures the code remains open source.

## Contact

For questions, suggestions, or support, please contact us at mail@magnus-goedde.de.

With ❤️ from Karlsruhe, Germany.
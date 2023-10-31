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
  - [User Personas](#user-personas)
    - [1. Dance Enthusiast - Social Dancer (Sarah)](#1-dance-enthusiast---social-dancer-sarah)
    - [2. Event Organizer - Dance Instructor (Alex)](#2-event-organizer---dance-instructor-alex)
    - [3. Newcomer to Dancing (Michael)](#3-newcomer-to-dancing-michael)
  - [User Stories](#user-stories)
    - [As Sarah, the Dance Enthusiast:](#as-sarah-the-dance-enthusiast)
    - [As Alex, the Event Organizer:](#as-alex-the-event-organizer)
  - [License](#license)
  - [Contact](#contact)

## Installation

Set up postgres database and auth0. Set missing secret environment variables in frontend/.env.local.template and backend/.env/*.template. Rename files and delete suffix ".template".

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

## User Personas

### 1. Dance Enthusiast - Social Dancer (Sarah)

- **Description:** Sarah is a passionate social dancer who loves salsa, kizomba, and bachata. She enjoys attending events, meeting fellow dancers, and learning new moves. Often traveling, she seeks dance events in various cities.

### 2. Event Organizer - Dance Instructor (Alex)

- **Description:** Alex is an experienced dance instructor and event organizer. He teach salsa, bachata, and kizomba classes in the local area and regularly host dance events. Alex is interested in promoting their events to a wider audience and connecting with dancers who want to attend their classes and parties.

### 3. Newcomer to Dancing (Michael)

- **Description:** Michael is new to the world of dance and wants to explore salsa, kizomba, and bachata. He is looking for beginner-friendly dance events and online dance communities where he can learn and practice dance steps.

## User Stories

### As Sarah, the Dance Enthusiast:

1. **Search for Dance Events:** As a salsa, kizomba, and bachata enthusiast, I want to search for local dance events happening this weekend so that I can plan my schedule.

2. **View Event Details:** As a user, I want to view details of a dance event, including location, date, time, and dance instructors, to decide if it's worth attending.

3. **Connect with Dancers:** As a member of the dance community, I want to connect with other dancers and event organizers through WhatsApp and Telegram groups.

### As Alex, the Event Organizer:

1. **Create and Publish Events:** As a dance event organizer, I want to create and publish new dance events, providing all the necessary event details, to attract attendees.

## License

This project is licensed under the GNU General Public License (GPL) - see the [LICENSE](https://www.gnu.org/licenses/gpl-3.0.en.html) file for details. The GNU GPL is a "viral" license that requires anyone using or modifying GPL-licensed code to release their changes under the same GPL license. This ensures the code remains open source.

## Contact

For questions, suggestions, or support, please contact us at mail@magnus-goedde.de.

With ❤️ from Karlsruhe, Germany.
# React School Management Backend

This is the **backend server** for the React School Management App, built with **Node.js**, **Express**, and **MongoDB**.  
It handles user management, assignments, submissions, and review workflow.

---

## Features & Workflow

- **Admin**
  - Create and manage **Teacher** and **Student** users  

- **Teacher**
  - Create and publish **Assignments**  
  - View all student submissions  
  - Review and update submitted answers  

- **Student**
  - View published assignments  
  - Submit answers for assignments  

**Workflow Summary:**  
1. Admin creates Teacher and Student users.  
2. Teacher creates and publishes assignments.  
3. Students view assignments and submit answers.  
4. Teacher reviews submissions and updates them.  

---

## Prerequisites

- Node.js (v16 or above recommended)  
- npm or yarn  
- MongoDB (local or Atlas)  

---

## Getting Started

1. **Clone the repository**

```
git clone https://github.com/David-santhan/EduPortal-Backend
```
2. Navigate to the backend folder
   ```
   cd backend
   ```
3. Install dependencies
   ```
   npm i
   ```
4. Configure environment variables
    I am giving my .env file detais for your reference
   ```
   PORT=8000
   MONGO_URI=mongodb+srv://EduPortal:EduPortal@eduportal.syxgvyb.mongodb.net/?retryWrites=true&w=majority&appName=EduPortal
   JWT_SECRET=wlekfnsqdnsidnsnsxjwdin_123DNDKNDKSKSdjsn@3#$$@DNN
   GMAIL_USER=mdsmarch14@gmail.com
   GMAIL_PASS=mpfb ptwt ohbm bfuz
   FRONTEND_URL=http://localhost:3000
``
5. Start the server

```
npm start
```
The server will run on http://localhost:8000 

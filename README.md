# KanbanFire

A basic Kanban board web application that allows users to login with a Google account and visualize ongoing projects by breaking them up into tasks in one of three ordered categories.

Built by Jared Jacobson using Angular and Firebase.

# Setup
You will need Node installed on your computer and to create your own Firebase project.

Start by installing the dependencies
```
npm i
```

Then create a secrets.ts file in the /src/environments/ folder and enter your Firebase configuration
```
export const env = {
    firebase: {
        apiKey: "",
        authDomain: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: "",
        measurementId: ""
    }
}
```

Now you can either serve the project locally for development
```
ng serve
```

Build the files for production
```
ng build
```

Or deploy it using Firebase
```
ng deploy
```
# Capstone

## Requirements

- Python 3.13.2
- Angular 20.1.5
- Node 22.14.0
- Ionic 7.2.1
- npm 10.9.2 
- Firebase 14.12.1
- Flask 3.1.2
- flask-cors 6.0.1
- firebase-admin 7.1.0
- google-cloud-firestore 2.21.0
- gunicorn 23.0.0


## Entorno Virtual 


Entorno virtual Ionic + Angular
```bash
python -m venv venv

venv\Scripts\activate


```


Entorno virtual Backend (desde la Raíz)
```bash
cd backend
py -m venv .venv
.\.venv\Scripts\activate

```

Para salir del entorno virtual (venv) se ejecuta el siguiente comando:

```bash
deactivate
```


## Install

```bash
npm install

```
En caso de ser necesario instalar el paquete de Firebase y/o backend se ejecuta el siguiente comando:

```bash
 npm i firebase @angular/fire@20

 pip install Flask flask-cors firebase-admin google-cloud-firestore gunicorn

 pip install python-dotenv

```



## Run

Correr app

```bash

ionic serve

```


Correr backend

```bash

python backend/app.py

```

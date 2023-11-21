FROM node:21.2.0

RUN mkdir -p /users/app

WORKDIR /users/app

COPY . .

RUN npm install

EXPOSE 3000

CMD ['npm', 'start']


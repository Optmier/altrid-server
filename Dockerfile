FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN yarn install
COPY . .
EXPOSE 9000
CMD ["npm", "start"]
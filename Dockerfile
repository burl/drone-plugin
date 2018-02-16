FROM node:8
ENV NODE_ENV=dev
ADD package.tgz /
ADD test-cmd /package/test-cmd
WORKDIR /package
RUN ls -lh
RUN yarn install
CMD ["node", "/package/test-cmd"]

NAME = biomerieux-poc
PORT = 3000

all: build run

build:
	@echo "Build of docker image $(NAME)..."
	docker build -t $(NAME) .

run:
	@echo "Running on port $(PORT)..."
	docker run --env-file .env -p $(PORT):$(PORT) $(NAME)

stop:
	@echo "Docker stop"
	-docker stop $$(docker ps -q --filter ancestor=$(NAME)) 2>/dev/null

clean: stop
	@echo "Cleaning of the docker image"
	-docker rmi $(NAME) 2>/dev/null

re: clean all

.PHONY: all build run stop clean re demo
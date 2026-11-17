NAME = biomerieux-poc
PORT = 3000

all: build run

build:
	@echo "Buiild of docker image $(NAME)..."
	docker build -t $(NAME) .

run:
	@echo "Running on port $(PORT)..."
	docker run -p $(PORT):$(PORT) $(NAME)

stop:
	@echo "Docker stop"
	-docker stop $$(docker ps -q --filter ancestor=$(NAME)) 2>/dev/null

clean: stop
	@echo "cleaning of the docker image"
	-docker rmi $(NAME) 2>/dev/null

re: clean all

.PHONY: all build run stop clean re
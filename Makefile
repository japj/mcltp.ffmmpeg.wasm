all: build

.PHONY: build
build:
	docker buildx build \
		-o ./packages/core\
		.
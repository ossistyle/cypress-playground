set e+x

IMAGE_NAME=cypress/docker:v1

echo "Building $IMAGE_NAME"
docker build --progress=plain --no-cache -t $IMAGE_NAME .
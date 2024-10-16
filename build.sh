set e+x

IMAGE_NAME=cypress/docker:v1

echo "Building $IMAGE_NAME"
docker build --progress=plain -t $IMAGE_NAME .
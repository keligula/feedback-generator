function localtunnel {
  lt -p 5000 -s s8ojejdi5
}

until localtunnel; do
echo "localtunnel server crashed"
sleep 2
done

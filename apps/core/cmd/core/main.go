package main

import (
	"log"

	"inflightflow/apps/core/internal/app"
)

func main() {
	if err := app.Run(); err != nil {
		log.Fatalf("core failed: %v", err)
	}
}

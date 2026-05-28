package hardware

import (
	"testing"

	"inflightflow/apps/core/internal/hardware/mock"
	"inflightflow/apps/core/internal/hardware/real"
)

func TestAdapterModeContracts(t *testing.T) {
	realName := real.Name()
	mockName := mock.Name()

	if realName != "real" {
		t.Fatalf("expected real adapter name=real, got %s", realName)
	}
	if mockName != "mock" {
		t.Fatalf("expected mock adapter name=mock, got %s", mockName)
	}
	if realName == mockName {
		t.Fatalf("adapter mode names must be distinct")
	}
}


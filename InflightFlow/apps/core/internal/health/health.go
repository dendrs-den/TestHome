package health

type Response struct {
	Status       string `json:"status"`
	Service      string `json:"service"`
	HardwareMode string `json:"hardwareMode"`
}

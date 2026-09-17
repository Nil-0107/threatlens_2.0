from backend.app.services.origin_tracer import origin_tracer

def test_trace_hops():
    headers = [
        "from mail.corp.com [209.85.216.42] by mx.google.com;",
        "from mail.attacker-relay.ru (mail.attacker-relay.ru [185.220.101.5]) by mail.corp.com;",
        "from localhost (127.0.0.1) by mail.attacker-relay.ru with SMTP;",
    ]
    hops = origin_tracer.trace_hops(headers)
    assert len(hops) == 3

    # Earliest hop (bottom of headers): 127.0.0.1
    assert hops[0]["ip"] == "127.0.0.1"
    assert hops[0]["is_internal"] is True

    # Next hop (first external hop): 185.220.101.5 should be marked as likely origin!
    assert hops[1]["ip"] == "185.220.101.5"
    assert hops[1]["is_internal"] is False
    assert hops[1]["is_likely_origin"] is True
    assert hops[1]["country"] == "Russia"

    # Latest hop (destination gateway)
    assert hops[2]["ip"] == "209.85.216.42"
    assert hops[2]["is_likely_origin"] is False


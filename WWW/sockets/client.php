<?php
error_reporting(E_ALL);

$data = $_POST['jsondata'];

set_time_limit(0);

/* Get the port for the WWW service. */
$service_port = 10000;

/* Get the IP address for the target host. */
$address = 'localhost';

/* Create a TCP/IP socket. */
$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);


$result = socket_connect($socket, $address, $service_port);

$out = '';

socket_write($socket, $data, strlen($data));
sleep(1);
$escape = "!ALLSENDED!";
socket_write($socket, $escape, strlen($escape));

while ($out = socket_read($socket, 2048)) {
    echo $out;
}

socket_close($socket);
?>